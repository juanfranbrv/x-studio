import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireSameUser } from "./lib/authz";
import {
  CONTENT_ASSET_STATUSES,
  extractContentAssetsFromSessions,
  mergeContentAssetAnnotations,
  parseContentAssetKey,
  type ContentAssetAnnotation,
  type ContentLibrarySessionRow,
} from "./contentLibrary.shared";

const SUPPORTED_MODULES = new Set(["image", "carousel"]);
const MAX_ASSETS = 240;

function limitText(value: string | undefined, max: number) {
  const clean = (value || "").trim();
  if (!clean) return undefined;
  return clean.length > max ? clean.slice(0, max) : clean;
}

function normalizeStatus(value: string) {
  const clean = value.trim();
  if ((CONTENT_ASSET_STATUSES as readonly string[]).includes(clean)) return clean;
  return "draft";
}

function normalizeAssetKeys(value: string[]) {
  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean))).slice(0, 80);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function resolveStorageUrl(ctx: QueryCtx, value: unknown) {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  if (!clean) return undefined;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  return (await ctx.storage.getUrl(clean as Id<"_storage">).catch(() => null)) ?? undefined;
}

async function resolveSnapshotUrls(ctx: QueryCtx, snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return snapshot;
  const next = { ...(snapshot as Record<string, unknown>) };

  if (next.module === "image") {
    const generations = Array.isArray(next.sessionGenerations)
      ? next.sessionGenerations as Array<Record<string, unknown>>
      : [];
    next.sessionGenerations = await Promise.all(generations.map(async (item) => {
      const row = { ...item };
      row.preview_image_url =
        await resolveStorageUrl(ctx, row.preview_image_url) ||
        await resolveStorageUrl(ctx, row.preview_image_storage_id) ||
        await resolveStorageUrl(ctx, row.image_url) ||
        await resolveStorageUrl(ctx, row.image_storage_id);
      row.original_image_url =
        await resolveStorageUrl(ctx, row.original_image_url) ||
        await resolveStorageUrl(ctx, row.original_image_storage_id) ||
        await resolveStorageUrl(ctx, row.image_url) ||
        await resolveStorageUrl(ctx, row.image_storage_id);
      return row;
    }));
  }

  if (next.module === "carousel") {
    const previewState = next.previewState && typeof next.previewState === "object"
      ? { ...(next.previewState as Record<string, unknown>) }
      : {};
    const slides = Array.isArray(previewState.slides)
      ? previewState.slides as Array<Record<string, unknown>>
      : [];
    previewState.slides = await Promise.all(slides.map(async (item) => {
      const row = { ...item };
      row.imagePreviewUrl =
        await resolveStorageUrl(ctx, row.imagePreviewUrl) ||
        await resolveStorageUrl(ctx, row.image_preview_storage_id) ||
        await resolveStorageUrl(ctx, row.imageUrl) ||
        await resolveStorageUrl(ctx, row.image_storage_id);
      row.imageOriginalUrl =
        await resolveStorageUrl(ctx, row.imageOriginalUrl) ||
        await resolveStorageUrl(ctx, row.image_original_storage_id) ||
        await resolveStorageUrl(ctx, row.imageUrl) ||
        await resolveStorageUrl(ctx, row.image_storage_id);
      return row;
    }));
    next.previewState = previewState;
  }

  return next;
}

async function findAnnotation(ctx: MutationCtx, userId: string, assetKey: string) {
  return await ctx.db
    .query("content_asset_annotations")
    .withIndex("by_user_asset", (q) => q.eq("user_id", userId).eq("asset_key", assetKey))
    .first();
}

async function upsertAnnotation(
  ctx: MutationCtx,
  args: {
    user_id: string;
    asset_key: string;
    status: string;
    planned_at?: string;
    platform?: string;
    format?: string;
    campaign?: string;
    notes?: string;
  },
) {
  const now = new Date().toISOString();
  const payload = {
    user_id: args.user_id,
    asset_key: args.asset_key.trim(),
    status: normalizeStatus(args.status),
    planned_at: limitText(args.planned_at, 40),
    platform: limitText(args.platform, 80),
    format: limitText(args.format, 80),
    campaign: limitText(args.campaign, 80),
    notes: limitText(args.notes, 1200),
    updated_at: now,
  };

  if (!payload.asset_key) throw new Error("asset_key required");

  const existing = await findAnnotation(ctx, args.user_id, payload.asset_key);

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return await ctx.db.get(existing._id);
  }

  const id = await ctx.db.insert("content_asset_annotations", {
    ...payload,
    created_at: now,
  });
  return await ctx.db.get(id);
}

async function removeAnnotation(ctx: MutationCtx, userId: string, assetKey: string) {
  const existing = await findAnnotation(ctx, userId, assetKey);
  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

function removeImageGenerationFromSnapshot(snapshot: unknown, generationId: string) {
  const next = asRecord(snapshot);
  const generations = Array.isArray(next.sessionGenerations)
    ? next.sessionGenerations as Array<Record<string, unknown>>
    : [];
  return {
    ...next,
    sessionGenerations: generations.filter((generation, index) => {
      const id = typeof generation.id === "string" && generation.id.trim()
        ? generation.id.trim()
        : `${index}`;
      return id !== generationId;
    }),
  };
}

export const listAssets = query({
  args: {
    user_id: v.string(),
    brand_id: v.optional(v.id("brand_dna")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const limit = Math.max(1, Math.min(args.limit ?? MAX_ASSETS, MAX_ASSETS));

    // Cuando hay kit de marca activo, segmentamos las publicaciones por marca
    // usando el índice compuesto; si no, caemos al listado global por usuario.
    const brandId = args.brand_id;
    const sessionRows = brandId
      ? await ctx.db
          .query("work_sessions")
          .withIndex("by_user_brand_module_updated", (q) =>
            q.eq("user_id", args.user_id).eq("brand_id", brandId).eq("module", "image"),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("work_sessions")
          .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", "image"))
          .order("desc")
          .take(limit);
    const carouselRows = brandId
      ? await ctx.db
          .query("work_sessions")
          .withIndex("by_user_brand_module_updated", (q) =>
            q.eq("user_id", args.user_id).eq("brand_id", brandId).eq("module", "carousel"),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("work_sessions")
          .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", "carousel"))
          .order("desc")
          .take(limit);

    const rows = [...sessionRows, ...carouselRows]
      .filter((row) => SUPPORTED_MODULES.has(row.module))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, limit);

    const sessions: ContentLibrarySessionRow[] = await Promise.all(rows.map(async (row) => ({
      _id: String(row._id),
      user_id: row.user_id,
      module: row.module,
      brand_id: row.brand_id ? String(row.brand_id) : undefined,
      title: row.title,
      root_prompt: row.root_prompt,
      snapshot: await resolveSnapshotUrls(ctx, row.snapshot),
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));

    const annotations = await ctx.db
      .query("content_asset_annotations")
      .filter((q) => q.eq(q.field("user_id"), args.user_id))
      .collect() as ContentAssetAnnotation[];

    return mergeContentAssetAnnotations(
      extractContentAssetsFromSessions(sessions),
      annotations,
    ).slice(0, limit);
  },
});

export const updateAnnotation = mutation({
  args: {
    user_id: v.string(),
    asset_key: v.string(),
    status: v.string(),
    planned_at: v.optional(v.string()),
    platform: v.optional(v.string()),
    format: v.optional(v.string()),
    campaign: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    return await upsertAnnotation(ctx, args);
  },
});

export const bulkUpdateAnnotations = mutation({
  args: {
    user_id: v.string(),
    asset_keys: v.array(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const assetKeys = normalizeAssetKeys(args.asset_keys);
    const results = [];
    for (const assetKey of assetKeys) {
      results.push(await upsertAnnotation(ctx, {
        user_id: args.user_id,
        asset_key: assetKey,
        status: args.status,
      }));
    }
    return { updated: results.length };
  },
});

export const bulkSetCampaign = mutation({
  args: {
    user_id: v.string(),
    asset_keys: v.array(v.string()),
    campaign: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const assetKeys = normalizeAssetKeys(args.asset_keys);
    const campaign = limitText(args.campaign, 80);
    const now = new Date().toISOString();
    let updated = 0;

    // Merge-safe: solo toca el campo campaign, preserva estado/fecha/etc.
    for (const assetKey of assetKeys) {
      const existing = await findAnnotation(ctx, args.user_id, assetKey);
      if (existing) {
        await ctx.db.patch(existing._id, { campaign, updated_at: now });
      } else {
        await ctx.db.insert("content_asset_annotations", {
          user_id: args.user_id,
          asset_key: assetKey,
          status: "draft",
          campaign,
          created_at: now,
          updated_at: now,
        });
      }
      updated += 1;
    }

    return { updated };
  },
});

export const bulkDeleteAssets = mutation({
  args: {
    user_id: v.string(),
    asset_keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const assetKeys = normalizeAssetKeys(args.asset_keys);
    let deleted = 0;

    for (const assetKey of assetKeys) {
      const parsed = parseContentAssetKey(assetKey);
      if (!parsed) continue;

      const sessionId = parsed.sessionId as Id<"work_sessions">;
      const session = await ctx.db.get(sessionId);
      if (!session || session.user_id !== args.user_id) continue;

      if (parsed.module === "image") {
        const snapshot = removeImageGenerationFromSnapshot(session.snapshot, parsed.generationId);
        await ctx.db.patch(session._id, {
          snapshot,
          updated_at: new Date().toISOString(),
        });
        await removeAnnotation(ctx, args.user_id, assetKey);
        deleted += 1;
        continue;
      }

      if (parsed.module === "carousel") {
        await ctx.db.delete(session._id);
        await removeAnnotation(ctx, args.user_id, assetKey);
        deleted += 1;
      }
    }

    return { deleted };
  },
});

export const setPlannedAt = mutation({
  args: {
    user_id: v.string(),
    asset_key: v.string(),
    planned_at: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const assetKey = args.asset_key.trim();
    if (!assetKey) throw new Error("asset_key required");

    const planned_at = limitText(args.planned_at, 40);
    const now = new Date().toISOString();

    // Merge-safe: solo toca planned_at (para drag&drop del calendario).
    const existing = await findAnnotation(ctx, args.user_id, assetKey);
    if (existing) {
      await ctx.db.patch(existing._id, { planned_at, updated_at: now });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("content_asset_annotations", {
      user_id: args.user_id,
      asset_key: assetKey,
      status: "draft",
      planned_at,
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(id);
  },
});

// --- Campaigns CRUD (campaigns are first-class so they can exist without assets) ---

async function annotationsByCampaign(ctx: MutationCtx, userId: string, campaign: string) {
  return await ctx.db
    .query("content_asset_annotations")
    .withIndex("by_user_campaign", (q) => q.eq("user_id", userId).eq("campaign", campaign))
    .collect();
}

export const listCampaigns = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const rows = await ctx.db
      .query("content_campaigns")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
    return rows
      .map((row) => ({ id: String(row._id), name: row.name, color: row.color }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createCampaign = mutation({
  args: { user_id: v.string(), name: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const name = limitText(args.name, 80);
    if (!name) throw new Error("name required");

    const existing = await ctx.db
      .query("content_campaigns")
      .withIndex("by_user_name", (q) => q.eq("user_id", args.user_id).eq("name", name))
      .first();
    if (existing) return existing;

    const now = new Date().toISOString();
    const id = await ctx.db.insert("content_campaigns", {
      user_id: args.user_id,
      name,
      color: limitText(args.color, 16),
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(id);
  },
});

export const renameCampaign = mutation({
  args: { user_id: v.string(), campaign_id: v.id("content_campaigns"), name: v.string() },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const row = await ctx.db.get(args.campaign_id);
    if (!row || row.user_id !== args.user_id) throw new Error("campaign not found");
    const newName = limitText(args.name, 80);
    if (!newName) throw new Error("name required");

    const now = new Date().toISOString();
    const oldName = row.name;
    await ctx.db.patch(args.campaign_id, { name: newName, updated_at: now });

    if (oldName && oldName !== newName) {
      const annotations = await annotationsByCampaign(ctx, args.user_id, oldName);
      for (const annotation of annotations) {
        await ctx.db.patch(annotation._id, { campaign: newName, updated_at: now });
      }
    }

    return await ctx.db.get(args.campaign_id);
  },
});

export const deleteCampaign = mutation({
  args: { user_id: v.string(), campaign_id: v.id("content_campaigns") },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const row = await ctx.db.get(args.campaign_id);
    if (!row || row.user_id !== args.user_id) return { deleted: 0, unassigned: 0 };

    const now = new Date().toISOString();
    const name = row.name;
    await ctx.db.delete(args.campaign_id);

    let unassigned = 0;
    if (name) {
      const annotations = await annotationsByCampaign(ctx, args.user_id, name);
      for (const annotation of annotations) {
        await ctx.db.patch(annotation._id, { campaign: undefined, updated_at: now });
        unassigned += 1;
      }
    }

    return { deleted: 1, unassigned };
  },
});
