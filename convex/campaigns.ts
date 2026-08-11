import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSameUser } from "./lib/authz";
import type { Doc } from "./_generated/dataModel";

/**
 * Cola de generacion por lotes (docs/API_AUTOMATIZACION.md).
 *
 * El encolado es lo unico que ocurre de forma sincrona: generar 60 imagenes no
 * cabe en una peticion HTTP, asi que aqui solo se crea el trabajo y sus items.
 */

const MAX_ITEMS_PER_JOB = 200;

function summarizeJob(job: Doc<"campaign_jobs">) {
  return {
    job_id: job._id,
    name: job.name,
    status: job.status,
    source: job.source,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    created_at: job.created_at,
    finished_at: job.finished_at,
  };
}

/**
 * Crea el lote y sus items. Idempotente por `idempotency_key`: reintentar el
 * mismo envio (una conexion que se cayo, un cliente que reintenta) devuelve el
 * trabajo ya creado en vez de duplicar generacion y cobro.
 */
export const enqueue = mutation({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
    name: v.string(),
    source: v.string(),
    idempotency_key: v.optional(v.string()),
    manifest: v.any(),
    items: v.array(
      v.object({
        ref: v.string(),
        payload: v.any(),
        scheduled_at: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);

    if (args.items.length === 0) {
      throw new Error("El lote no tiene publicaciones.");
    }
    if (args.items.length > MAX_ITEMS_PER_JOB) {
      throw new Error(`Demasiadas publicaciones: ${args.items.length}. Maximo ${MAX_ITEMS_PER_JOB}.`);
    }

    if (args.idempotency_key) {
      const existing = await ctx.db
        .query("campaign_jobs")
        .withIndex("by_user_idempotency", (q) =>
          q.eq("user_id", args.clerk_user_id).eq("idempotency_key", args.idempotency_key),
        )
        .first();

      if (existing) {
        return { ...summarizeJob(existing), reused: true };
      }
    }

    const brand = await ctx.db.get(args.brand_id);
    if (!brand || brand.clerk_user_id !== args.clerk_user_id) {
      throw new Error("El kit de marca no existe o no pertenece a este usuario.");
    }

    const now = new Date().toISOString();

    const jobId = await ctx.db.insert("campaign_jobs", {
      user_id: args.clerk_user_id,
      brand_id: args.brand_id,
      name: args.name,
      source: args.source === "api" ? "api" : "ui",
      idempotency_key: args.idempotency_key,
      status: "queued",
      total: args.items.length,
      completed: 0,
      failed: 0,
      manifest: args.manifest,
      created_at: now,
    });

    for (const [position, item] of args.items.entries()) {
      await ctx.db.insert("campaign_job_items", {
        job_id: jobId,
        user_id: args.clerk_user_id,
        ref: item.ref,
        status: "pending",
        position,
        payload: item.payload,
        scheduled_at: item.scheduled_at,
        attempts: 0,
        updated_at: now,
      });
    }

    const job = await ctx.db.get(jobId);
    return { ...summarizeJob(job!), reused: false };
  },
});

/** Estado del lote con el detalle de cada publicacion. */
export const getJob = query({
  args: {
    clerk_user_id: v.string(),
    job_id: v.id("campaign_jobs"),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);

    const job = await ctx.db.get(args.job_id);
    if (!job || job.user_id !== args.clerk_user_id) return null;

    const items = await ctx.db
      .query("campaign_job_items")
      .withIndex("by_job_position", (q) => q.eq("job_id", args.job_id))
      .order("asc")
      .collect();

    return {
      ...summarizeJob(job),
      items: items.map((item) => ({
        ref: item.ref,
        status: item.status,
        scheduled_at: item.scheduled_at,
        asset_key: item.asset_key,
        error: item.error,
        attempts: item.attempts,
      })),
    };
  },
});

/** Lotes del usuario, del mas reciente al mas antiguo. */
export const listJobs = query({
  args: {
    clerk_user_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);

    const jobs = await ctx.db
      .query("campaign_jobs")
      .withIndex("by_user_created", (q) => q.eq("user_id", args.clerk_user_id))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 100));

    return jobs.map(summarizeJob);
  },
});

/**
 * Cancela las publicaciones que aun no se han generado. Las ya hechas se
 * quedan: cancelar no debe tirar trabajo (ni creditos) ya gastado.
 */
export const cancelJob = mutation({
  args: {
    clerk_user_id: v.string(),
    job_id: v.id("campaign_jobs"),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);

    const job = await ctx.db.get(args.job_id);
    if (!job || job.user_id !== args.clerk_user_id) throw new Error("Lote no encontrado.");
    if (job.status === "done" || job.status === "cancelled") {
      return { success: true, cancelled: 0 };
    }

    const pending = await ctx.db
      .query("campaign_job_items")
      .withIndex("by_job_status", (q) => q.eq("job_id", args.job_id).eq("status", "pending"))
      .collect();

    const now = new Date().toISOString();
    for (const item of pending) {
      await ctx.db.patch(item._id, { status: "skipped", updated_at: now });
    }

    await ctx.db.patch(args.job_id, { status: "cancelled", finished_at: now });

    return { success: true, cancelled: pending.length };
  },
});
