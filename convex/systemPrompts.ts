import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/authz";

export const getByKey = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        return await ctx.db
            .query("system_prompts")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("system_prompts").collect();
    },
});

export const upsert = mutation({
    args: {
        key: v.string(),
        name: v.string(),
        body: v.string(),
        description: v.optional(v.string()),
        updated_by: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const existing = await ctx.db
            .query("system_prompts")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        const timestamp = new Date().toISOString();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                body: args.body,
                description: args.description,
                updated_at: timestamp,
                updated_by: args.updated_by,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("system_prompts", {
                key: args.key,
                name: args.name,
                body: args.body,
                description: args.description,
                updated_at: timestamp,
                updated_by: args.updated_by,
            });
        }
    },
});

export const remove = mutation({
    args: { id: v.id("system_prompts") },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        await ctx.db.delete(id);
    },
});
