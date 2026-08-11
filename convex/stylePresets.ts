import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/authz";
import { ensureUniqueSlug, slugify } from "./lib/slug";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const isAdmin = (email: string) => ADMIN_EMAILS.includes((email || "").toLowerCase().trim());
const MAX_INLINE_IMAGE_DATA_URL_CHARS = 240_000;
const MAX_STYLE_PROMPT_CHARS = 800;

function compactImageUrl(url: unknown): string {
  const value = typeof url === "string" ? url : "";
  if (!value) return "";
  if (!value.startsWith("data:")) return value;
  // Evita enviar blobs base64 gigantes al cliente en un unico query payload.
  if (value.length > MAX_INLINE_IMAGE_DATA_URL_CHARS) return "";
  return value;
}

function ensureValidImageUrl(url: unknown): string {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) throw new Error("La imagen del estilo es obligatoria.");
  if (value.startsWith("data:")) {
    throw new Error("No se admite data URL en image_url. Sube la imagen optimizada (WebP) y guarda la URL.");
  }
  return value;
}

function ensureOptionalImageUrl(url: unknown): string | undefined {
  if (url === undefined || url === null) return undefined;
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return undefined;
  if (value.startsWith("data:")) {
    throw new Error("No se admite data URL en thumbnail_url.");
  }
  return value;
}

/**
 * Devuelve un slug unico para el preset. Convex no tiene indices unicos, asi
 * que la unicidad se comprueba aqui contra `by_slug`, excluyendo el propio
 * registro cuando se trata de una edicion.
 */
async function resolveUniqueSlug(
  ctx: MutationCtx,
  args: { desired?: unknown; name: string; selfId?: Id<"style_presets"> },
): Promise<string> {
  const requested = typeof args.desired === "string" ? args.desired.trim() : "";
  const base = slugify(requested || args.name);

  const collisions = await ctx.db
    .query("style_presets")
    .withIndex("by_slug", (q) => q.eq("slug", base))
    .collect();

  const isFree = collisions.every((row) => String(row._id) === String(args.selfId ?? ""));
  if (isFree) return base;

  // Hay choque: reune los slugs ocupados para elegir el primer sufijo libre.
  const all = await ctx.db.query("style_presets").collect();
  const taken = all
    .filter((row) => String(row._id) !== String(args.selfId ?? ""))
    .map((row) => row.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);

  return ensureUniqueSlug(base, taken);
}

function compactAnalysis(analysis: unknown) {
  const source = (analysis && typeof analysis === "object")
    ? (analysis as Record<string, unknown>)
    : {};

  const keywords = Array.isArray(source.keywords)
    ? source.keywords
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 8)
        .map((item) => item.slice(0, 500))
    : [];

  const colorPalette = Array.isArray(source.colorPalette)
    ? source.colorPalette
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 12)
        .map((item) => item.slice(0, 24))
    : [];

  const subject = (source.subject && typeof source.subject === "string") ? source.subject : "unknown";
  const subjectLabel = typeof source.subjectLabel === "string" ? source.subjectLabel.slice(0, 120) : "N/A";
  const lighting = typeof source.lighting === "string" ? source.lighting : "unknown";
  const confidence = typeof source.confidence === "number" ? source.confidence : 0;

  return {
    subject,
    subjectLabel,
    lighting,
    colorPalette,
    keywords,
    confidence,
  };
}

function extractStylePrompt(analysis: unknown): string {
  const source = (analysis && typeof analysis === "object")
    ? (analysis as Record<string, unknown>)
    : {};
  const keywords = Array.isArray(source.keywords) ? source.keywords : [];
  const first = keywords.find((item): item is string => typeof item === "string" && item.trim().length > 0) || "";
  return first.slice(0, MAX_STYLE_PROMPT_CHARS);
}

function normalizeStylePrompt(input: unknown): string {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, 3_000);
}

function buildPromptAndPreview(args: {
  style_prompt?: unknown;
  analysis_preview?: unknown;
  analysis?: unknown;
}) {
  const previewFromAnalysis = compactAnalysis(args.analysis);
  const previewFromInput = compactAnalysis(args.analysis_preview);
  const preview = args.analysis_preview !== undefined ? previewFromInput : previewFromAnalysis;
  const promptFromInput = normalizeStylePrompt(args.style_prompt);
  const promptFromAnalysis = extractStylePrompt(args.analysis);
  const stylePrompt = (promptFromInput || promptFromAnalysis).slice(0, 3_000);
  return {
    style_prompt: stylePrompt,
    analysis_preview: preview,
  };
}

function buildAnalysisForClient(stylePrompt: unknown, preview: unknown) {
  const compact = compactAnalysis(preview);
  const prompt = normalizeStylePrompt(stylePrompt);
  const existingKeywords = Array.isArray(compact.keywords) ? compact.keywords : [];
  const mergedKeywords = [
    ...(prompt ? [prompt] : []),
    ...existingKeywords.filter((item) => item !== prompt),
  ].slice(0, 8);
  return {
    ...compact,
    keywords: mergedKeywords,
  };
}

function toAdminListItem(row: {
  _id: unknown;
  name: unknown;
  slug?: unknown;
  description?: unknown;
  image_url: unknown;
  thumbnail_url?: unknown;
  is_active: unknown;
  sort_order: unknown;
  updated_at: unknown;
  created_at?: unknown;
  updated_by?: unknown;
}) {
  return {
    _id: row._id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image_url: compactImageUrl(row.thumbnail_url ?? row.image_url),
    full_image_url: compactImageUrl(row.image_url),
    thumbnail_url: compactImageUrl(row.thumbnail_url),
    is_active: row.is_active,
    sort_order: row.sort_order,
    updated_at: row.updated_at,
    created_at: row.created_at,
    updated_by: row.updated_by,
  };
}

export const listActiveImages = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("style_presets")
      .withIndex("by_active_sort", (q) => q.eq("is_active", true))
      .order("asc")
      .collect();

    return rows.map((row) => ({
      _id: row._id,
      slug: row.slug,
      image_url: compactImageUrl(row.thumbnail_url ?? row.image_url),
    }));
  },
});

export const listAllPaginated = query({
  args: {
    admin_email: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const page = await ctx.db
      .query("style_presets")
      .withIndex("by_sort_order")
      .order("asc")
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map((row) => toAdminListItem(row)),
    };
  },
});

export const listAllForAdmin = query({
  args: {
    admin_email: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("style_presets")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();

    return rows.map((row) => toAdminListItem(row));
  },
});

export const getByIdForAdmin = query({
  args: {
    admin_email: v.string(),
    id: v.id("style_presets"),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Style preset not found");

    return {
      _id: preset._id,
      name: preset.name,
      slug: preset.slug,
      image_url: compactImageUrl(preset.thumbnail_url ?? preset.image_url),
      full_image_url: compactImageUrl(preset.image_url),
      thumbnail_url: compactImageUrl(preset.thumbnail_url),
      is_active: preset.is_active,
      sort_order: preset.sort_order,
      style_prompt: normalizeStylePrompt(preset.style_prompt) || extractStylePrompt(preset.analysis_preview ?? preset.analysis),
      analysis: buildAnalysisForClient(preset.style_prompt, preset.analysis_preview ?? preset.analysis),
      updated_at: preset.updated_at,
    };
  },
});

export const getActiveById = query({
  args: {
    id: v.id("style_presets"),
  },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.id);
    if (!preset || !preset.is_active) return null;

    return {
      _id: preset._id,
      name: preset.name,
      slug: preset.slug,
      analysis: buildAnalysisForClient(preset.style_prompt, preset.analysis_preview ?? preset.analysis),
      image_url: compactImageUrl(preset.thumbnail_url ?? preset.image_url),
      full_image_url: compactImageUrl(preset.image_url),
      style_prompt: normalizeStylePrompt(preset.style_prompt) || extractStylePrompt(preset.analysis_preview ?? preset.analysis),
      updated_at: preset.updated_at,
    };
  },
});

export const getRawImageByIdForAdmin = query({
  args: {
    admin_email: v.string(),
    id: v.id("style_presets"),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Style preset not found");
    return {
      _id: preset._id,
      name: preset.name,
      image_url: preset.image_url,
      thumbnail_url: preset.thumbnail_url,
    };
  },
});

export const create = mutation({
  args: {
    admin_email: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    image_url: v.string(),
    thumbnail_url: v.optional(v.string()),
    style_prompt: v.optional(v.string()),
    analysis_preview: v.optional(v.any()),
    analysis: v.optional(v.any()),
    is_active: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const now = new Date().toISOString();
    const highest = await ctx.db
      .query("style_presets")
      .withIndex("by_sort_order")
      .order("desc")
      .take(1);
    const maxOrder = highest[0]?.sort_order || 0;
    const nextPromptAndPreview = buildPromptAndPreview({
      style_prompt: args.style_prompt,
      analysis_preview: args.analysis_preview,
      analysis: args.analysis,
    });

    const name = args.name.trim();
    const slug = await resolveUniqueSlug(ctx, { desired: args.slug, name });

    return await ctx.db.insert("style_presets", {
      name,
      slug,
      description: args.description?.trim() || undefined,
      image_url: ensureValidImageUrl(args.image_url),
      thumbnail_url: ensureOptionalImageUrl(args.thumbnail_url),
      style_prompt: nextPromptAndPreview.style_prompt || undefined,
      analysis_preview: nextPromptAndPreview.analysis_preview,
      is_active: args.is_active ?? true,
      sort_order: args.sort_order ?? (maxOrder + 1),
      created_at: now,
      updated_at: now,
      updated_by: args.admin_email,
    });
  },
});

export const update = mutation({
  args: {
    admin_email: v.string(),
    id: v.id("style_presets"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    image_url: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    style_prompt: v.optional(v.string()),
    analysis_preview: v.optional(v.any()),
    analysis: v.optional(v.any()),
    is_active: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Style preset not found");

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: args.admin_email,
    };
    if (typeof args.name === "string") patch.name = args.name.trim();
    if (args.slug !== undefined) {
      // Un slug ya publicado es un identificador con el que otros integran, asi
      // que solo se recalcula cuando el admin lo pide explicitamente.
      patch.slug = await resolveUniqueSlug(ctx, {
        desired: args.slug,
        name: (patch.name as string | undefined) ?? preset.name,
        selfId: args.id,
      });
    } else if (!preset.slug) {
      // Preset heredado sin slug: se le asigna uno al vuelo en la primera edicion.
      patch.slug = await resolveUniqueSlug(ctx, {
        name: (patch.name as string | undefined) ?? preset.name,
        selfId: args.id,
      });
    }
    if (args.description !== undefined) patch.description = args.description?.trim() || undefined;
    if (typeof args.image_url === "string") patch.image_url = ensureValidImageUrl(args.image_url);
    if (args.thumbnail_url !== undefined) patch.thumbnail_url = ensureOptionalImageUrl(args.thumbnail_url);
    if (args.style_prompt !== undefined) patch.style_prompt = normalizeStylePrompt(args.style_prompt) || undefined;
    if (args.analysis_preview !== undefined || args.analysis !== undefined) {
      const nextPromptAndPreview = buildPromptAndPreview({
        style_prompt: args.style_prompt ?? preset.style_prompt,
        analysis_preview: args.analysis_preview,
        analysis: args.analysis,
      });
      patch.analysis_preview = nextPromptAndPreview.analysis_preview;
      if (args.style_prompt === undefined && args.analysis !== undefined) {
        patch.style_prompt = nextPromptAndPreview.style_prompt || undefined;
      }
    }
    if (typeof args.is_active === "boolean") patch.is_active = args.is_active;
    if (typeof args.sort_order === "number") patch.sort_order = args.sort_order;

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

/**
 * Catalogo completo de estilos activos para consumo externo (API). Devuelve
 * SIEMPRE todos los activos, sin el tope de MAX_ACTIVE_PRESETS que aplica la
 * UI: quien integra por API tiene que poder elegir cualquiera de los que haya
 * en la plataforma en ese momento. Carga ligera a proposito (sin imagenes).
 */
export const listCatalog = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("style_presets")
      .withIndex("by_active_sort", (q) => q.eq("is_active", true))
      .order("asc")
      .collect();

    return rows.map((row) => ({
      slug: row.slug ?? "",
      name: row.name,
      description: row.description,
      sort_order: row.sort_order,
    }));
  },
});

/**
 * Datos minimos para bautizar presets con IA: lo que describe el estilo, sin
 * arrastrar imagenes ni payloads pesados.
 */
export const listForNamingForAdmin = query({
  args: {
    admin_email: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const rows = await ctx.db.query("style_presets").withIndex("by_sort_order").order("asc").collect();

    return rows.map((row) => {
      const preview = compactAnalysis(row.analysis_preview ?? row.analysis);
      return {
        _id: row._id,
        name: row.name,
        slug: row.slug,
        is_active: row.is_active,
        style_prompt: normalizeStylePrompt(row.style_prompt) || extractStylePrompt(row.analysis_preview ?? row.analysis),
        keywords: preview.keywords,
        subject_label: preview.subjectLabel,
        lighting: preview.lighting,
      };
    });
  },
});

/**
 * Resuelve un estilo activo por su slug. Es el punto de entrada pensado para
 * consumo externo (API / manifiestos), donde el `_id` de Convex no sirve
 * porque cambia entre deployments.
 */
export const getActiveBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = slugify(args.slug);
    const rows = await ctx.db
      .query("style_presets")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();

    const preset = rows.find((row) => row.is_active);
    if (!preset) return null;

    return {
      _id: preset._id,
      name: preset.name,
      slug: preset.slug,
      analysis: buildAnalysisForClient(preset.style_prompt, preset.analysis_preview ?? preset.analysis),
      image_url: compactImageUrl(preset.thumbnail_url ?? preset.image_url),
      full_image_url: compactImageUrl(preset.image_url),
      style_prompt: normalizeStylePrompt(preset.style_prompt) || extractStylePrompt(preset.analysis_preview ?? preset.analysis),
      updated_at: preset.updated_at,
    };
  },
});

/**
 * Rellena el slug de los presets que aun no lo tienen, derivandolo del nombre.
 * Idempotente: los que ya tienen slug se dejan intactos.
 */
async function runBackfillSlugs(ctx: MutationCtx) {
  const rows = await ctx.db.query("style_presets").withIndex("by_sort_order").collect();
  const taken = rows
    .map((row) => row.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);

  const assigned: Array<{ name: string; slug: string }> = [];

  for (const row of rows) {
    if (typeof row.slug === "string" && row.slug.length > 0) continue;
    const slug = ensureUniqueSlug(row.name, taken);
    taken.push(slug);
    await ctx.db.patch(row._id, { slug });
    assigned.push({ name: row.name, slug });
  }

  return {
    success: true,
    total: rows.length,
    assigned: assigned.length,
    details: assigned,
  };
}

export const backfillSlugs = mutation({
  args: {
    admin_email: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    return await runBackfillSlugs(ctx);
  },
});

/**
 * Misma operacion, invocable desde el CLI de Convex (`npx convex run`) durante
 * el despliegue, donde no hay identidad de Clerk que validar.
 */
export const backfillSlugsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await runBackfillSlugs(ctx);
  },
});

export const remove = mutation({
  args: {
    admin_email: v.string(),
    id: v.id("style_presets"),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const updatePrompt = mutation({
  args: {
    admin_email: v.string(),
    id: v.id("style_presets"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Style preset not found");

    const current = (preset.analysis && typeof preset.analysis === "object")
      ? (preset.analysis as Record<string, unknown>)
      : {};
    const prompt = args.prompt.trim().slice(0, 3_000);
    const currentPreview = preset.analysis_preview ?? current;
    const currentCompact = compactAnalysis(currentPreview);

    await ctx.db.patch(args.id, {
      style_prompt: prompt || undefined,
      analysis_preview: currentCompact,
      updated_at: new Date().toISOString(),
      updated_by: args.admin_email,
    });

    return {
      success: true,
      style_prompt: prompt,
    };
  },
});

export const reorder = mutation({
  args: {
    admin_email: v.string(),
    ordered_ids: v.array(v.id("style_presets")),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const rows = await ctx.db
      .query("style_presets")
      .withIndex("by_sort_order")
      .collect();
    if (rows.length <= 1) return { success: true, updated: 0 };

    const existingIds = new Set(rows.map((row) => String(row._id)));
    const dedupedRequested: typeof args.ordered_ids = [];
    const seen = new Set<string>();

    for (const id of args.ordered_ids) {
      const key = String(id);
      if (!existingIds.has(key) || seen.has(key)) continue;
      seen.add(key);
      dedupedRequested.push(id);
    }

    const missing = rows
      .map((row) => row._id)
      .filter((id) => !seen.has(String(id)));

    const finalOrder = [...dedupedRequested, ...missing];
    const now = new Date().toISOString();
    let updated = 0;

    for (let index = 0; index < finalOrder.length; index += 1) {
      const id = finalOrder[index];
      const nextSort = index + 1;
      const current = rows.find((row) => String(row._id) === String(id));
      if (!current) continue;
      if (current.sort_order === nextSort && current.updated_by === args.admin_email) continue;

      await ctx.db.patch(id, {
        sort_order: nextSort,
        updated_at: now,
        updated_by: args.admin_email,
      });
      updated += 1;
    }

    return { success: true, updated };
  },
});

