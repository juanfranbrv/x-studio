import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireIdentity, requireSameUser, requireAdmin } from "./lib/authz";
import { ensureUniqueSlug, slugify } from "./lib/slug";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Devuelve un slug unico DENTRO DEL USUARIO. A diferencia de los estilos, los
 * kits de marca son por cuenta: dos usuarios distintos pueden tener "Mi Oliva
 * Gourmet" y ambos merecen el slug bonito.
 */
async function resolveUniqueBrandSlug(
    ctx: MutationCtx,
    args: { desired?: unknown; name: string; ownerId: string; selfId?: Id<"brand_dna"> },
): Promise<string> {
    const requested = typeof args.desired === "string" ? args.desired.trim() : "";
    const base = slugify(requested || args.name);

    const siblings = await ctx.db
        .query("brand_dna")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", args.ownerId))
        .collect();

    const taken = siblings
        .filter((row) => String(row._id) !== String(args.selfId ?? ""))
        .map((row) => row.slug)
        .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);

    return ensureUniqueSlug(base, taken);
}

export const getBrands = query({
    args: { owner_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.owner_id);
        return await ctx.db
            .query("brands")
            .withIndex("by_owner", (q) => q.eq("owner_id", args.owner_id))
            .collect();
    },
});

export const getBrandById = query({
    args: { brand_id: v.id("brands") },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);
        const brand = await ctx.db.get(args.brand_id);
        if (brand && identity && brand.owner_id !== identity.subject) {
            throw new Error("Forbidden: not the brand owner");
        }
        return brand;
    },
});

export const createBrand = mutation({
    args: {
        owner_id: v.string(),
        name: v.string(),
        website_url: v.optional(v.string()),
        brand_dna: v.object({
            colors: v.array(v.string()),
            tone: v.string(),
            fonts: v.object({
                heading: v.optional(v.string()),
                body: v.optional(v.string()),
            }),
            visual_aesthetic: v.optional(v.string()),
            debug: v.optional(v.any()),
        }),
    },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.owner_id);
        return await ctx.db.insert("brands", {
            ...args,
            created_at: new Date().toISOString(),
        });
    },
});

export const updateBrandDNA = mutation({
    args: {
        brand_id: v.id("brands"),
        brand_dna: v.object({
            colors: v.array(v.string()),
            tone: v.string(),
            fonts: v.object({
                heading: v.optional(v.string()),
                body: v.optional(v.string()),
            }),
            visual_aesthetic: v.optional(v.string()),
            debug: v.optional(v.any()),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);
        const existing = await ctx.db.get(args.brand_id);
        if (!existing) throw new Error("Brand not found");
        if (identity && existing.owner_id !== identity.subject) {
            throw new Error("Forbidden: not the brand owner");
        }
        await ctx.db.patch(args.brand_id, {
            brand_dna: args.brand_dna,
        });
    },
});

export const getBrandDNA = query({
    args: { url: v.string(), clerk_user_id: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerk_user_id) {
            return null;
        }
        await requireSameUser(ctx, args.clerk_user_id);

        return await ctx.db
            .query("brand_dna")
            .withIndex("by_url_user", (q) => q.eq("url", args.url).eq("clerk_user_id", args.clerk_user_id))
            .first();
    },
});

export const upsertBrandDNA = mutation({
    args: {
        url: v.string(),
        brand_name: v.string(),
        tagline: v.string(),
        business_overview: v.string(),
        cta_url_enabled: v.optional(v.boolean()),
        brand_values: v.array(v.string()),
        tone_of_voice: v.array(v.string()),
        visual_aesthetic: v.array(v.string()),
        colors: v.any(),
        fonts: v.array(v.any()),
        text_assets: v.optional(v.any()),
        logo_url: v.optional(v.string()),
        logos: v.optional(v.any()), // array of logo objects
        favicon_url: v.optional(v.string()),
        screenshot_url: v.optional(v.string()),
        images: v.optional(v.any()),
        target_audience: v.optional(v.array(v.string())),
        social_links: v.optional(v.any()),
        emails: v.optional(v.array(v.string())),
        phones: v.optional(v.array(v.string())),
        addresses: v.optional(v.array(v.string())),
        preferred_language: v.optional(v.string()),
        api_trace: v.optional(v.any()),
        debug: v.optional(v.any()),
        clerk_user_id: v.string(),
        updated_at: v.string(),
    },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const existing = await ctx.db
            .query("brand_dna")
            .withIndex("by_url_user", (q) => q.eq("url", args.url).eq("clerk_user_id", args.clerk_user_id))
            .first();

        if (existing) {
            // El slug no se recalcula al actualizar: una vez publicado es un
            // identificador con el que se integra desde fuera. Solo se asigna
            // si el kit venia de antes de que existiera el campo.
            const patch = existing.slug
                ? args
                : {
                    ...args,
                    slug: await resolveUniqueBrandSlug(ctx, {
                        name: args.brand_name,
                        ownerId: args.clerk_user_id,
                        selfId: existing._id,
                    }),
                };
            await ctx.db.patch(existing._id, patch);
            return existing._id;
        }

        const slug = await resolveUniqueBrandSlug(ctx, {
            name: args.brand_name,
            ownerId: args.clerk_user_id,
        });
        return await ctx.db.insert("brand_dna", { ...args, slug });
    },
});

export const getBrandDNAByClerkId = query({
    args: { clerk_user_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const brands = await ctx.db
            .query("brand_dna")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", args.clerk_user_id))
            .order("desc")
            .collect();

        return await Promise.all(
            brands.map(async (brand) => {
                // Resolve top-level URLs - detect raw IDs or bad /_storage/ URLs
                const needsResolve = (url: string) => !url.startsWith("http") || url.includes("/_storage/");
                const extractId = (url: string) => url.includes("/_storage/") ? url.split("/_storage/").pop()! : url;

                // Debug helper
                const resolveWithLog = async (fieldName: string, url: string | undefined) => {
                    if (!url) return url;
                    if (!needsResolve(url)) return url;
                    const id = extractId(url);
                    const resolved = await ctx.storage.getUrl(id as any);
                    console.log(`[getBrandDNAByClerkId] ${fieldName}: id=${id}, resolved=${resolved !== null}`);
                    return resolved || url;
                };

                const logo_url = await resolveWithLog("logo_url", brand.logo_url);
                const screenshot_url = await resolveWithLog("screenshot_url", brand.screenshot_url);
                const favicon_url = await resolveWithLog("favicon_url", brand.favicon_url);

                // Resolve URLs in images array (logos field doesn't exist in schema)
                const images = brand.images ? await Promise.all(brand.images.map(async (image: any) => {
                    if (typeof image === 'string') {
                        return needsResolve(image) ? (await ctx.storage.getUrl(extractId(image) as any)) || image : image;
                    } else if (image && image.url) {
                        const url = needsResolve(image.url) ? (await ctx.storage.getUrl(extractId(image.url) as any)) || image.url : image.url;
                        return { ...image, url };
                    }
                    return image;
                })) : brand.images;

                return {
                    ...brand,
                    logo_url,
                    screenshot_url,
                    favicon_url,
                    images,
                };
            })
        );
    },
});

export const listSummariesByClerkId = query({
    args: { clerk_user_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const brands = await ctx.db
            .query("brand_dna")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", args.clerk_user_id))
            .order("desc")
            .collect();

        const needsResolve = (url: string) => !url.startsWith("http") || url.includes("/_storage/");
        const extractId = (url: string) => url.includes("/_storage/") ? url.split("/_storage/").pop()! : url;
        const resolveUrl = async (url: string | undefined) => {
            if (!url) return null;
            if (!needsResolve(url)) return url;
            return (await ctx.storage.getUrl(extractId(url) as any)) || url;
        };

        return await Promise.all(
            brands.map(async (brand) => {
                const logo_url = await resolveUrl(brand.logo_url);
                const favicon_url = await resolveUrl(brand.favicon_url);
                const screenshot_url = await resolveUrl(brand.screenshot_url);
                const logosCount = Array.isArray(brand.logos) ? brand.logos.length : (brand.logo_url ? 1 : 0);
                const colorsCount = Array.isArray(brand.colors) ? brand.colors.length : 0;
                const fontsCount = Array.isArray(brand.fonts) ? brand.fonts.length : 0;
                const imagesCount = Array.isArray(brand.images) ? brand.images.length : 0;
                const brandValuesCount = Array.isArray(brand.brand_values) ? brand.brand_values.length : 0;
                const toneCount = Array.isArray(brand.tone_of_voice) ? brand.tone_of_voice.length : 0;
                const textAssets = brand.text_assets as any;
                const hasTextAssets = Boolean(textAssets) && (
                    (Array.isArray(textAssets?.marketing_hooks) && textAssets.marketing_hooks.length > 0) ||
                    (Array.isArray(textAssets?.ctas) && textAssets.ctas.length > 0) ||
                    (String(textAssets?.brand_context || "").trim().length > 0)
                );

                return {
                    _id: brand._id,
                    brand_name: brand.brand_name,
                    slug: brand.slug,
                    url: brand.url,
                    tagline: brand.tagline || "",
                    business_overview_length: String(brand.business_overview || "").trim().length,
                    logo_url,
                    favicon_url,
                    screenshot_url,
                    logos_count: logosCount,
                    colors_count: colorsCount,
                    fonts_count: fontsCount,
                    images_count: imagesCount,
                    brand_values_count: brandValuesCount,
                    tone_of_voice_count: toneCount,
                    has_text_assets: hasTextAssets,
                    updated_at: brand.updated_at,
                };
            })
        );
    },
});

/**
 * Resuelve un kit de marca del usuario por su slug. Es el punto de entrada
 * pensado para consumo externo (API / manifiestos de campana), donde el `_id`
 * de Convex no sirve porque es opaco.
 */
export const getBrandDNABySlug = query({
    args: { slug: v.string(), clerk_user_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const slug = slugify(args.slug);

        const rows = await ctx.db
            .query("brand_dna")
            .withIndex("by_clerk_slug", (q) => q.eq("clerk_user_id", args.clerk_user_id).eq("slug", slug))
            .collect();

        return rows[0] ?? null;
    },
});

/**
 * Rellena el slug de los kits que aun no lo tienen, derivandolo del nombre.
 * Idempotente y por usuario: los slugs solo compiten dentro de cada cuenta.
 */
async function runBackfillBrandSlugs(ctx: MutationCtx) {
    const rows = await ctx.db.query("brand_dna").collect();

    // Agrupa por propietario: la unicidad es por cuenta, no global.
    const takenByOwner = new Map<string, string[]>();
    for (const row of rows) {
        const owner = row.clerk_user_id || "";
        if (!takenByOwner.has(owner)) takenByOwner.set(owner, []);
        if (typeof row.slug === "string" && row.slug.length > 0) {
            takenByOwner.get(owner)!.push(row.slug);
        }
    }

    const assigned: Array<{ brand_name: string; slug: string }> = [];

    for (const row of rows) {
        if (typeof row.slug === "string" && row.slug.length > 0) continue;
        const owner = row.clerk_user_id || "";
        const taken = takenByOwner.get(owner)!;
        const slug = ensureUniqueSlug(row.brand_name, taken);
        taken.push(slug);
        await ctx.db.patch(row._id, { slug });
        assigned.push({ brand_name: row.brand_name, slug });
    }

    return { success: true, total: rows.length, assigned: assigned.length, details: assigned };
}

export const backfillBrandSlugs = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await runBackfillBrandSlugs(ctx);
    },
});

/**
 * Misma operacion, invocable desde el CLI de Convex durante el despliegue,
 * donde no hay identidad de Clerk que validar.
 */
export const backfillBrandSlugsInternal = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await runBackfillBrandSlugs(ctx);
    },
});

export const getBrandDNAById = query({
    args: { id: v.id("brand_dna"), clerk_user_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const brand = await ctx.db.get(args.id);
        if (!brand) return null;
        if (brand.clerk_user_id !== args.clerk_user_id) return null;

        // URL resolution helpers (same as getBrandDNAByClerkId)
        const needsResolve = (url: string) => !url.startsWith("http") || url.includes("/_storage/");
        const extractId = (url: string) => url.includes("/_storage/") ? url.split("/_storage/").pop()! : url;

        const resolveUrl = async (url: string | undefined) => {
            if (!url) return url;
            if (!needsResolve(url)) return url;
            const id = extractId(url);
            return (await ctx.storage.getUrl(id as any)) || url;
        };

        const logo_url = await resolveUrl(brand.logo_url);
        const screenshot_url = await resolveUrl(brand.screenshot_url);
        const favicon_url = await resolveUrl(brand.favicon_url);

        // Resolve URLs in images array
        const images = brand.images ? await Promise.all(brand.images.map(async (image: any) => {
            if (typeof image === 'string') {
                return needsResolve(image) ? (await ctx.storage.getUrl(extractId(image) as any)) || image : image;
            } else if (image && image.url) {
                const url = needsResolve(image.url) ? (await ctx.storage.getUrl(extractId(image.url) as any)) || image.url : image.url;
                return { ...image, url };
            }
            return image;
        })) : brand.images;

        return {
            ...brand,
            logo_url,
            screenshot_url,
            favicon_url,
            images,
        };
    },
});

export const updateBrandDNADoc = mutation({
    args: {
        id: v.id("brand_dna"),
        clerk_user_id: v.string(),
        updates: v.object({
            url: v.optional(v.string()),
            brand_name: v.optional(v.string()),
            tagline: v.optional(v.string()),
            business_overview: v.optional(v.string()),
            cta_url_enabled: v.optional(v.boolean()),
            brand_values: v.optional(v.array(v.string())),
            tone_of_voice: v.optional(v.array(v.string())),
            visual_aesthetic: v.optional(v.array(v.string())),
            colors: v.optional(v.any()), // array ok
            fonts: v.optional(v.array(v.any())),
            logo_url: v.optional(v.string()),
            logos: v.optional(v.any()), // array of objects
            favicon_url: v.optional(v.string()),
            screenshot_url: v.optional(v.string()),
            images: v.optional(v.any()), // array of objects
            target_audience: v.optional(v.array(v.string())),
            social_links: v.optional(v.any()),
            emails: v.optional(v.array(v.string())),
            phones: v.optional(v.array(v.string())),
            addresses: v.optional(v.array(v.string())),
            preferred_language: v.optional(v.string()),
            api_trace: v.optional(v.any()),
            text_assets: v.optional(v.any()),
            updated_at: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Brand kit not found");
        if (existing.clerk_user_id !== args.clerk_user_id) throw new Error("Unauthorized");
        await ctx.db.patch(args.id, args.updates);
    },
});

export const deleteBrandDNA = mutation({
    args: { id: v.id("brand_dna"), clerk_user_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Brand kit not found");
        if (existing.clerk_user_id !== args.clerk_user_id) throw new Error("Unauthorized");
        await ctx.db.delete(args.id);
    },
});

export const createEmptyBrandKit = mutation({
    args: {
        clerk_user_id: v.string(),
        brand_name: v.string(),
        source_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_user_id);
        const now = new Date().toISOString();
        const slug = await resolveUniqueBrandSlug(ctx, {
            name: args.brand_name,
            ownerId: args.clerk_user_id,
        });

        // Create a minimal brand_dna record with empty defaults
        const brandId = await ctx.db.insert("brand_dna", {
            url: args.source_url || `manual-${Date.now()}`,
            brand_name: args.brand_name,
            slug,
            tagline: "",
            business_overview: "",
            cta_url_enabled: false,
            brand_values: [],
            tone_of_voice: [],
            visual_aesthetic: [],
            colors: [],
            fonts: [],
            text_assets: [],
            clerk_user_id: args.clerk_user_id,
            updated_at: now,
        });

        return brandId;
    },
});

/**
 * Migration utility: returns all brand_dna docs with no valid clerk_user_id
 * (undefined, null, empty string, or the literal 'anonymous' fallback).
 * Used once to diagnose and then patch orphaned records.
 */
export const listOrphanedBrandKits = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        const all = await ctx.db.query("brand_dna").collect();
        return all
            .filter((b) => !b.clerk_user_id || b.clerk_user_id === 'anonymous')
            .map((b) => ({
                _id: b._id,
                brand_name: b.brand_name,
                url: b.url,
                clerk_user_id: b.clerk_user_id ?? null,
                updated_at: b.updated_at,
            }));
    },
});

/**
 * Diagnostic: returns total count + unique clerk_user_ids present in brand_dna.
 * Use GET /api/admin/migrate-brand-kits to call this.
 */
export const debugBrandDNAStats = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        const all = await ctx.db.query("brand_dna").collect();
        const idMap: Record<string, number> = {};
        for (const b of all) {
            const key = b.clerk_user_id ?? '__undefined__';
            idMap[key] = (idMap[key] ?? 0) + 1;
        }

        // Resolve emails from users table
        const uniqueIds = Object.keys(idMap).filter((k) => k !== '__undefined__');
        const emailMap: Record<string, string> = {};
        await Promise.all(
            uniqueIds.map(async (clerkId) => {
                const user = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerk_id", clerkId))
                    .first();
                emailMap[clerkId] = user?.email ?? '(no user record)';
            })
        );

        return {
            total: all.length,
            users: Object.entries(idMap).map(([clerk_id, count]) => ({
                clerk_id,
                email: emailMap[clerk_id] ?? '(no user record)',
                brand_kits: count,
            })),
        };
    },
});

/**
 * Migration mutation: assigns clerk_user_id to all brand_dna docs that currently
 * have no valid owner (undefined, null, empty, or 'anonymous').
 * Safe to run once per environment; returns the count of patched documents.
 */
export const claimOrphanedBrandKits = mutation({
    args: { clerk_user_id: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        if (!args.clerk_user_id || args.clerk_user_id === 'anonymous') {
            throw new Error('Invalid clerk_user_id');
        }
        const all = await ctx.db.query("brand_dna").collect();
        const orphans = all.filter((b) => !b.clerk_user_id || b.clerk_user_id === 'anonymous');

        await Promise.all(
            orphans.map((b) =>
                ctx.db.patch(b._id, { clerk_user_id: args.clerk_user_id })
            )
        );

        return { patched: orphans.length };
    },
});

export const cloneBrandDNAToUser = mutation({
    args: {
        source_id: v.id("brand_dna"),
        target_clerk_user_id: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const source = await ctx.db.get(args.source_id);
        if (!source) throw new Error("Source brand kit not found");

        const { _id, _creationTime, ...data } = source as any;
        const now = new Date().toISOString();

        // El slug es unico por usuario: al clonar hay que recalcularlo contra
        // los kits del destinatario, no arrastrar el del origen.
        const slug = await resolveUniqueBrandSlug(ctx, {
            desired: source.slug,
            name: source.brand_name,
            ownerId: args.target_clerk_user_id,
        });

        return await ctx.db.insert("brand_dna", {
            ...data,
            slug,
            clerk_user_id: args.target_clerk_user_id,
            updated_at: now,
        });
    },
});
