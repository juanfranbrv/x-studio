import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireSameUser, requireAdmin } from "./lib/authz";
import type { Doc } from "./_generated/dataModel";

/**
 * Cola de generacion por lotes (docs/API_AUTOMATIZACION.md).
 *
 * El encolado es lo unico que ocurre de forma sincrona: generar 60 imagenes no
 * cabe en una peticion HTTP, asi que aqui solo se crea el trabajo y sus items.
 */

const MAX_ITEMS_PER_JOB = 200;

type CampaignCtx = QueryCtx | MutationCtx;

async function requireCampaignUser(ctx: CampaignCtx, clerkUserId: string) {
  await requireAdmin(ctx);
  await requireSameUser(ctx, clerkUserId);
}

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
    await requireCampaignUser(ctx, args.clerk_user_id);

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
    await requireCampaignUser(ctx, args.clerk_user_id);

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
    await requireCampaignUser(ctx, args.clerk_user_id);

    const jobs = await ctx.db
      .query("campaign_jobs")
      .withIndex("by_user_created", (q) => q.eq("user_id", args.clerk_user_id))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 100));

    return jobs.map(summarizeJob);
  },
});

/**
 * Lote con el detalle completo de cada publicacion, incluido su payload.
 * Lo usa la exportacion, que necesita los textos para poder emparejar cada
 * imagen con su publicacion y su fecha.
 */
export const getJobForExport = query({
  args: {
    clerk_user_id: v.string(),
    job_id: v.id("campaign_jobs"),
  },
  handler: async (ctx, args) => {
    await requireCampaignUser(ctx, args.clerk_user_id);

    const job = await ctx.db.get(args.job_id);
    if (!job || job.user_id !== args.clerk_user_id) return null;

    const items = await ctx.db
      .query("campaign_job_items")
      .withIndex("by_job_position", (q) => q.eq("job_id", args.job_id))
      .order("asc")
      .collect();

    return {
      name: job.name,
      status: job.status,
      total: job.total,
      completed: job.completed,
      items: items.map((item) => ({
        ref: item.ref,
        status: item.status,
        asset_key: item.asset_key ?? null,
        scheduled_at: item.scheduled_at ?? null,
        payload: item.payload ?? null,
      })),
    };
  },
});

/** Siguientes publicaciones pendientes del lote, en orden. */
export const claimPendingItems = query({
  args: {
    clerk_user_id: v.string(),
    job_id: v.id("campaign_jobs"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCampaignUser(ctx, args.clerk_user_id);

    const job = await ctx.db.get(args.job_id);
    if (!job || job.user_id !== args.clerk_user_id) return null;

    const items = await ctx.db
      .query("campaign_job_items")
      .withIndex("by_job_status", (q) => q.eq("job_id", args.job_id).eq("status", "pending"))
      .take(Math.min(args.limit, 25));

    const brandDoc = await ctx.db.get(job.brand_id);

    // Los logos pueden estar guardados como storageId o como ruta interna: se
    // resuelven aqui a URLs servibles, porque el worker los adjunta como
    // imagen de referencia y el proveedor tiene que poder descargarlos.
    const needsResolve = (url: string) => !url.startsWith("http") || url.includes("/_storage/");
    const extractId = (url: string) => (url.includes("/_storage/") ? url.split("/_storage/").pop()! : url);
    const resolveUrl = async (url: unknown): Promise<string | null> => {
      const value = typeof url === "string" ? url.trim() : "";
      if (!value) return null;
      if (!needsResolve(value)) return value;
      return (await ctx.storage.getUrl(extractId(value) as never)) || value;
    };

    const brand = brandDoc
      ? {
        ...brandDoc,
        logo_url: await resolveUrl(brandDoc.logo_url),
        logos: Array.isArray(brandDoc.logos)
          ? await Promise.all(
            brandDoc.logos.map(async (logo: unknown) => {
              if (typeof logo === "string") return { url: await resolveUrl(logo) };
              const entry = (logo ?? {}) as Record<string, unknown>;
              return { ...entry, url: await resolveUrl(entry.url) };
            }),
          )
          : [],
      }
      : null;

    return {
      job: summarizeJob(job),
      brand,
      items: items.map((item) => ({
        item_id: item._id,
        ref: item.ref,
        payload: item.payload,
        scheduled_at: item.scheduled_at,
        attempts: item.attempts,
      })),
    };
  },
});

/**
 * Devuelve una publicacion a la cola sin contarla como fallida: se usa cuando
 * fallo pero le quedan intentos, para que la recoja la siguiente tanda.
 */
export const requeueItem = mutation({
  args: {
    clerk_user_id: v.string(),
    item_id: v.id("campaign_job_items"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCampaignUser(ctx, args.clerk_user_id);
    const item = await ctx.db.get(args.item_id);
    if (!item || item.user_id !== args.clerk_user_id) throw new Error("Publicacion no encontrada.");

    await ctx.db.patch(args.item_id, {
      status: "pending",
      error: args.error,
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  },
});

/**
 * Devuelve a la cola las publicaciones fallidas del lote. Util cuando el fallo
 * era de configuracion (un modelo mal puesto) y no del contenido: se corrige y
 * se reintenta sin volver a encolar la campana entera.
 */
export const retryFailedItems = mutation({
  args: {
    clerk_user_id: v.string(),
    job_id: v.id("campaign_jobs"),
  },
  handler: async (ctx, args) => {
    await requireCampaignUser(ctx, args.clerk_user_id);

    const job = await ctx.db.get(args.job_id);
    if (!job || job.user_id !== args.clerk_user_id) throw new Error("Lote no encontrado.");

    const failed = await ctx.db
      .query("campaign_job_items")
      .withIndex("by_job_status", (q) => q.eq("job_id", args.job_id).eq("status", "failed"))
      .collect();

    const now = new Date().toISOString();
    for (const item of failed) {
      await ctx.db.patch(item._id, { status: "pending", attempts: 0, error: undefined, updated_at: now });
    }

    await ctx.db.patch(args.job_id, {
      failed: 0,
      status: failed.length > 0 ? "queued" : job.status,
      finished_at: undefined,
    });

    return { success: true, requeued: failed.length };
  },
});

/** Marca el arranque de una publicacion y cuenta el intento. */
export const startItem = mutation({
  args: {
    clerk_user_id: v.string(),
    item_id: v.id("campaign_job_items"),
  },
  handler: async (ctx, args) => {
    await requireCampaignUser(ctx, args.clerk_user_id);
    const item = await ctx.db.get(args.item_id);
    if (!item || item.user_id !== args.clerk_user_id) throw new Error("Publicacion no encontrada.");

    await ctx.db.patch(args.item_id, {
      status: "running",
      attempts: item.attempts + 1,
      updated_at: new Date().toISOString(),
    });

    await ctx.db.patch(item.job_id, { status: "running" });
    return { success: true };
  },
});

/**
 * Cierra una publicacion, con o sin exito, y actualiza los contadores del
 * lote. Un fallo NO detiene la campana: el item queda en `failed` con su
 * error y el resto sigue adelante.
 */
export const finishItem = mutation({
  args: {
    clerk_user_id: v.string(),
    item_id: v.id("campaign_job_items"),
    ok: v.boolean(),
    asset_key: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCampaignUser(ctx, args.clerk_user_id);
    const item = await ctx.db.get(args.item_id);
    if (!item || item.user_id !== args.clerk_user_id) throw new Error("Publicacion no encontrada.");

    const now = new Date().toISOString();

    await ctx.db.patch(args.item_id, {
      status: args.ok ? "done" : "failed",
      asset_key: args.asset_key,
      error: args.ok ? undefined : (args.error || "Error desconocido"),
      updated_at: now,
    });

    const job = await ctx.db.get(item.job_id);
    if (!job) return { success: true };

    const completed = job.completed + (args.ok ? 1 : 0);
    const failed = job.failed + (args.ok ? 0 : 1);
    const terminado = completed + failed >= job.total;

    await ctx.db.patch(item.job_id, {
      completed,
      failed,
      status: terminado ? (failed === job.total ? "failed" : "done") : "running",
      finished_at: terminado ? now : undefined,
    });

    return { success: true, completed, failed, terminado };
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
    await requireCampaignUser(ctx, args.clerk_user_id);

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
