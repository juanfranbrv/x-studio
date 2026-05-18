import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
    normalizeStudioDebugOverlaysEnabled,
    STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY,
} from "../src/lib/studio-debug-visibility";
import {
    normalizeReplaceModuleEnabled,
    REPLACE_MODULE_ENABLED_SETTING_KEY,
} from "../src/lib/replace-module-visibility";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const isAdmin = (email: string) => ADMIN_EMAILS.includes(String(email || "").toLowerCase().trim());

export const getThemeSettings = query({
    args: {},
    handler: async (ctx) => {
        const [
            primary,
            secondary,
            surface,
            surfaceAlt,
            muted,
            border,
            ring,
        ] = await Promise.all([
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_primary")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_secondary")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_surface")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_surface_alt")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_muted")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_border")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "theme_ring")).first(),
        ]);

        return {
            primary: (primary?.value as string) || "243.4 75.4% 58.6%",
            secondary: (secondary?.value as string) || "330 81% 60%",
            surface: surface?.value as string | undefined,
            surfaceAlt: surfaceAlt?.value as string | undefined,
            muted: muted?.value as string | undefined,
            border: border?.value as string | undefined,
            ring: ring?.value as string | undefined,
        };
    },
});

export const getAIConfig = query({
    args: {},
    handler: async (ctx) => {
        const imageModel = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", "model_image_generation"))
            .first();

        const intelligenceModel = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", "model_intelligence"))
            .first();

        return {
            imageModel: (imageModel?.value as string) || "wisdom/gemini-3-pro-image-preview",
            intelligenceModel: (intelligenceModel?.value as string) || "wisdom/gemini-3-flash-preview",
        };
    },
});

function normalizeDuration(value: unknown, fallback: number) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1000, Math.round(parsed));
}

export const getCarouselVideoConfig = query({
    args: {},
    handler: async (ctx) => {
        const [slideDuration, lastSlideDuration] = await Promise.all([
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "carousel_video_slide_duration_ms")).first(),
            ctx.db.query("app_settings").withIndex("by_key", (q) => q.eq("key", "carousel_video_last_slide_duration_ms")).first(),
        ]);

        return {
            slideDurationMs: normalizeDuration(slideDuration?.value, 4000),
            lastSlideDurationMs: normalizeDuration(lastSlideDuration?.value, 6000),
        };
    },
});

export const getStudioDebugFlags = query({
    args: {},
    handler: async (ctx) => {
        const setting = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY))
            .first();

        return {
            showDebugOverlays: normalizeStudioDebugOverlaysEnabled(setting?.value),
        };
    },
});

export const getReplaceModuleFlags = query({
    args: {},
    handler: async (ctx) => {
        const setting = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", REPLACE_MODULE_ENABLED_SETTING_KEY))
            .first();

        return {
            showReplaceModule: normalizeReplaceModuleEnabled(setting?.value),
        };
    },
});

export const saveAppSetting = mutation({
    args: {
        admin_email: v.string(),
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const existing = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        const timestamp = new Date().toISOString();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                updated_at: timestamp,
                updated_by: args.admin_email,
            });
        } else {
            await ctx.db.insert("app_settings", {
                key: args.key,
                value: args.value,
                updated_at: timestamp,
                updated_by: args.admin_email,
            });
        }
    },
});
