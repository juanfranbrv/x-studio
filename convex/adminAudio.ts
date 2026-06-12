import { v } from "convex/values";
import { requireAdmin } from "./lib/authz";
import { mutation, query } from "./_generated/server";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];

function isAdmin(email: string) {
    return ADMIN_EMAILS.includes(String(email || "").toLowerCase().trim());
}

export const listAllForAdmin = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const rows = await ctx.db.query("admin_audio_tracks").withIndex("by_sort_order").collect();

        return await Promise.all(rows.map(async (row) => ({
            ...row,
            url: await ctx.storage.getUrl(row.storage_id),
        })));
    },
});

export const listActiveTracks = query({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db.query("admin_audio_tracks").withIndex("by_active", (q) => q.eq("is_active", true)).collect();
        const ordered = rows.sort((a, b) => a.sort_order - b.sort_order);

        const resolved = await Promise.all(ordered.map(async (row) => ({
            ...row,
            url: await ctx.storage.getUrl(row.storage_id),
        })));

        return resolved.filter((row) => Boolean(row.url));
    },
});

export const createTrack = mutation({
    args: {
        admin_email: v.string(),
        name: v.string(),
        storage_id: v.string(),
        mime_type: v.optional(v.string()),
        size_bytes: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const rows = await ctx.db.query("admin_audio_tracks").withIndex("by_sort_order").collect();
        const nextSortOrder = rows.length > 0 ? Math.max(...rows.map((row) => row.sort_order)) + 1 : 1;
        const timestamp = new Date().toISOString();

        return await ctx.db.insert("admin_audio_tracks", {
            name: args.name.trim(),
            storage_id: args.storage_id,
            mime_type: args.mime_type,
            size_bytes: args.size_bytes,
            is_active: true,
            sort_order: nextSortOrder,
            created_at: timestamp,
            updated_at: timestamp,
            updated_by: args.admin_email,
        });
    },
});

export const setTrackActive = mutation({
    args: {
        admin_email: v.string(),
        track_id: v.id("admin_audio_tracks"),
        is_active: v.boolean(),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        await ctx.db.patch(args.track_id, {
            is_active: args.is_active,
            updated_at: new Date().toISOString(),
            updated_by: args.admin_email,
        });
    },
});

export const deleteTrack = mutation({
    args: {
        admin_email: v.string(),
        track_id: v.id("admin_audio_tracks"),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const row = await ctx.db.get(args.track_id);
        if (!row) return;

        await ctx.storage.delete(row.storage_id);
        await ctx.db.delete(args.track_id);
    },
});
