// Funciones para migrar contenido entre deployments (dev -> prod), append-only.
// Son PUBLICAS pero protegidas por un secreto compartido (MIGRATION_SECRET, env
// del deployment) porque las funciones `internal` no se pueden invocar desde un
// ConvexHttpClient externo. El puente (ruta de servidor local) envia el mismo
// secreto que debe coincidir con el configurado en produccion.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { extractContentAssetsFromSessions, type ContentLibrarySessionRow } from "./contentLibrary.shared";

function assertSecret(secret: string) {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("unauthorized: MIGRATION_SECRET invalido o no configurado en el deployment destino");
  }
}

// Genera una URL de subida al storage del deployment destino.
export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    return await ctx.storage.generateUploadUrl();
  },
});

// Resuelve el clerk_id de un usuario por email en el deployment destino.
export const findClerkIdByEmail = query({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    const email = args.email.trim().toLowerCase();
    if (!email) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return user ? user.clerk_id : null;
  },
});

// TEMP DEBUG: replica el pipeline de listAssets (sin auth) para un usuario.
export const debugCheck = query({
  args: { secret: v.string(), user_id: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    const rows = await ctx.db
      .query("work_sessions")
      .withIndex("by_user_module", (q) => q.eq("user_id", args.user_id).eq("module", "image"))
      .collect();

    const sessions: ContentLibrarySessionRow[] = await Promise.all(rows.map(async (row) => {
      const snap = (row.snapshot && typeof row.snapshot === "object" && !Array.isArray(row.snapshot))
        ? { ...(row.snapshot as Record<string, unknown>) }
        : {};
      if (snap.module === "image" && Array.isArray(snap.sessionGenerations)) {
        snap.sessionGenerations = await Promise.all((snap.sessionGenerations as Array<Record<string, unknown>>).map(async (g) => {
          const r = { ...g };
          if (!r.preview_image_url && typeof r.preview_image_storage_id === "string") {
            r.preview_image_url = (await ctx.storage.getUrl(r.preview_image_storage_id as never).catch(() => null)) ?? undefined;
          }
          if (!r.image_url && typeof r.image_storage_id === "string") {
            r.image_url = (await ctx.storage.getUrl(r.image_storage_id as never).catch(() => null)) ?? undefined;
          }
          return r;
        }));
      }
      return {
        _id: String(row._id),
        user_id: row.user_id,
        module: row.module,
        title: row.title,
        snapshot: snap,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }));

    const assets = extractContentAssetsFromSessions(sessions);
    return {
      rowCount: rows.length,
      assetCount: assets.length,
      firstPreview: assets[0]?.preview_url ?? null,
    };
  },
});

// Lista activos migrables de un usuario en este deployment. Se usa desde la
// herramienta local para separar origen y destino sin depender del cliente.
export const listMigratableAssets = query({
  args: {
    secret: v.string(),
    user_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    const limit = Math.max(1, Math.min(args.limit ?? 240, 240));
    const modules = ["image", "carousel"] as const;
    const rows = (
      await Promise.all(modules.map((module) =>
        ctx.db
          .query("work_sessions")
          .withIndex("by_user_module", (q) => q.eq("user_id", args.user_id).eq("module", module))
          .collect()
      ))
    )
      .flat()
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, limit);

    const sessions: ContentLibrarySessionRow[] = await Promise.all(rows.map(async (row) => {
      const snap = (row.snapshot && typeof row.snapshot === "object" && !Array.isArray(row.snapshot))
        ? { ...(row.snapshot as Record<string, unknown>) }
        : {};

      if (snap.module === "image" && Array.isArray(snap.sessionGenerations)) {
        snap.sessionGenerations = await Promise.all((snap.sessionGenerations as Array<Record<string, unknown>>).map(async (g) => {
          const r = { ...g };
          if (!r.preview_image_url && typeof r.preview_image_storage_id === "string") {
            r.preview_image_url = (await ctx.storage.getUrl(r.preview_image_storage_id as never).catch(() => null)) ?? undefined;
          }
          if (!r.image_url && typeof r.image_storage_id === "string") {
            r.image_url = (await ctx.storage.getUrl(r.image_storage_id as never).catch(() => null)) ?? undefined;
          }
          if (!r.original_image_url && typeof r.original_image_storage_id === "string") {
            r.original_image_url = (await ctx.storage.getUrl(r.original_image_storage_id as never).catch(() => null)) ?? undefined;
          }
          return r;
        }));
      }

      if (snap.module === "carousel") {
        const previewState = snap.previewState && typeof snap.previewState === "object"
          ? { ...(snap.previewState as Record<string, unknown>) }
          : {};
        const slides = Array.isArray(previewState.slides)
          ? previewState.slides as Array<Record<string, unknown>>
          : [];
        previewState.slides = await Promise.all(slides.map(async (slide) => {
          const r = { ...slide };
          if (!r.imagePreviewUrl && typeof r.image_preview_storage_id === "string") {
            r.imagePreviewUrl = (await ctx.storage.getUrl(r.image_preview_storage_id as never).catch(() => null)) ?? undefined;
          }
          if (!r.imageOriginalUrl && typeof r.image_original_storage_id === "string") {
            r.imageOriginalUrl = (await ctx.storage.getUrl(r.image_original_storage_id as never).catch(() => null)) ?? undefined;
          }
          if (!r.imageUrl && typeof r.image_storage_id === "string") {
            r.imageUrl = (await ctx.storage.getUrl(r.image_storage_id as never).catch(() => null)) ?? undefined;
          }
          return r;
        }));
        snap.previewState = previewState;
      }

      return {
        _id: String(row._id),
        user_id: row.user_id,
        module: row.module,
        brand_id: row.brand_id ? String(row.brand_id) : undefined,
        title: row.title,
        root_prompt: row.root_prompt,
        snapshot: snap,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }));

    return extractContentAssetsFromSessions(sessions);
  },
});

// Inserta (append-only) una work_session migrada. No toca nada existente.
export const createMigratedSession = mutation({
  args: {
    secret: v.string(),
    user_id: v.string(),
    module: v.string(),
    title: v.optional(v.string()),
    source_asset_key: v.optional(v.string()),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    if (args.source_asset_key) {
      const existingRows = await ctx.db
        .query("work_sessions")
        .withIndex("by_user_module", (q) => q.eq("user_id", args.user_id).eq("module", args.module))
        .collect();
      const existing = existingRows.find((row) => {
        const snapshot = row.snapshot && typeof row.snapshot === "object" && !Array.isArray(row.snapshot)
          ? row.snapshot as Record<string, unknown>
          : {};
        const migration = snapshot.migration && typeof snapshot.migration === "object" && !Array.isArray(snapshot.migration)
          ? snapshot.migration as Record<string, unknown>
          : {};
        return migration.source_asset_key === args.source_asset_key;
      });
      if (existing) {
        return { id: String(existing._id), created: false };
      }
    }

    const now = new Date().toISOString();
    const id = await ctx.db.insert("work_sessions", {
      user_id: args.user_id,
      module: args.module,
      title: args.title,
      snapshot: args.snapshot,
      active: false,
      created_at: now,
      updated_at: now,
    });
    return { id: String(id), created: true };
  },
});
