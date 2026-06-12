import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/authz";
import { getCarouselCompositionRecommendation } from "../src/lib/carousel-composition-governance";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

export const listStructures = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const rows = await ctx.db.query("carousel_structures").order("asc").collect();
        return rows.sort((a, b) => a.order - b.order);
    }
});

export const listCompositions = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const rows = await ctx.db.query("carousel_compositions").order("asc").collect();
        return rows.sort((a, b) => a.order - b.order);
    }
});

export const createStructure = mutation({
    args: {
        admin_email: v.string(),
        structure_id: v.string(),
        name: v.string(),
        summary: v.string(),
        tension: v.optional(v.string()),
        flow: v.optional(v.string()),
        proof: v.optional(v.string()),
        cta: v.optional(v.string()),
        order: v.number(),
        isActive: v.boolean()
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const existing = await ctx.db.query("carousel_structures")
            .withIndex("by_structure_id", q => q.eq("structure_id", args.structure_id))
            .first();
        if (existing) throw new Error("Structure ID already exists");
        return await ctx.db.insert("carousel_structures", {
            structure_id: args.structure_id,
            name: args.name,
            summary: args.summary,
            tension: args.tension,
            flow: args.flow,
            proof: args.proof,
            cta: args.cta,
            order: args.order,
            isActive: args.isActive,
            created_at: new Date().toISOString()
        });
    }
});

export const updateStructure = mutation({
    args: {
        admin_email: v.string(),
        id: v.id("carousel_structures"),
        structure_id: v.optional(v.string()),
        name: v.optional(v.string()),
        summary: v.optional(v.string()),
        tension: v.optional(v.string()),
        flow: v.optional(v.string()),
        proof: v.optional(v.string()),
        cta: v.optional(v.string()),
        order: v.optional(v.number()),
        isActive: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const { admin_email, id, ...patch } = args;
        void admin_email;
        return await ctx.db.patch(id, { ...patch, updated_at: new Date().toISOString() });
    }
});

export const removeStructure = mutation({
    args: { admin_email: v.string(), id: v.id("carousel_structures") },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        await ctx.db.delete(args.id);
        return { success: true };
    }
});

export const createComposition = mutation({
    args: {
        admin_email: v.string(),
        composition_id: v.string(),
        structure_id: v.optional(v.string()),
        scope: v.string(),
        mode: v.string(),
        name: v.string(),
        description: v.string(),
        layoutPrompt: v.string(),
        icon: v.optional(v.string()),
        iconPrompt: v.optional(v.string()),
        order: v.number(),
        isActive: v.boolean()
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const existing = await ctx.db.query("carousel_compositions")
            .withIndex("by_composition_id", q => q.eq("composition_id", args.composition_id))
            .first();
        if (existing) throw new Error("Composition ID already exists");
        return await ctx.db.insert("carousel_compositions", {
            composition_id: args.composition_id,
            structure_id: args.structure_id,
            scope: args.scope,
            mode: args.mode,
            name: args.name,
            description: args.description,
            layoutPrompt: args.layoutPrompt,
            icon: args.icon,
            iconPrompt: args.iconPrompt,
            order: args.order,
            isActive: args.isActive,
            created_at: new Date().toISOString()
        });
    }
});

export const updateComposition = mutation({
    args: {
        admin_email: v.string(),
        id: v.id("carousel_compositions"),
        composition_id: v.optional(v.string()),
        structure_id: v.optional(v.string()),
        scope: v.optional(v.string()),
        mode: v.optional(v.string()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        layoutPrompt: v.optional(v.string()),
        icon: v.optional(v.string()),
        iconPrompt: v.optional(v.string()),
        order: v.optional(v.number()),
        isActive: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const { admin_email, id, ...patch } = args;
        void admin_email;
        return await ctx.db.patch(id, { ...patch, updated_at: new Date().toISOString() });
    }
});

export const applyAutomaticCompositionClassification = mutation({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const rows = await ctx.db.query("carousel_compositions").collect();
        let updated = 0;
        let modeChanges = 0;
        let scopeChanges = 0;

        for (const row of rows) {
            const recommendation = getCarouselCompositionRecommendation({
                composition_id: row.composition_id,
                name: row.name,
                description: row.description,
                layoutPrompt: row.layoutPrompt,
                scope: row.scope,
                mode: row.mode,
                structure_id: row.structure_id,
                isActive: row.isActive,
            });

            if (!recommendation.shouldChangeAnything) continue;

            const nextScope = recommendation.suggestedScope;
            const nextMode = recommendation.suggestedMode;

            await ctx.db.patch(row._id, {
                mode: nextMode,
                scope: nextScope,
                structure_id: nextScope === "global" ? undefined : row.structure_id,
                updated_at: new Date().toISOString()
            });

            updated += 1;
            if (row.mode !== nextMode) modeChanges += 1;
            if (row.scope !== nextScope) scopeChanges += 1;
        }

        return {
            total: rows.length,
            updated,
            modeChanges,
            scopeChanges
        };
    }
});

export const removeComposition = mutation({
    args: { admin_email: v.string(), id: v.id("carousel_compositions") },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        await ctx.db.delete(args.id);
        return { success: true };
    }
});
