import { v } from "convex/values";
import { requireAdmin } from "./lib/authz";
import { mutation, query } from "./_generated/server";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase().trim());

function normalizeKind(kind: string): "image" | "intelligence" {
    return kind === "image" ? "image" : "intelligence";
}

export const getModelCost = query({
    args: {
        model: v.string(),
        kind: v.string(),
    },
    handler: async (ctx, args) => {
        const model = args.model.trim();
        const kind = normalizeKind(args.kind);

        const exact = await ctx.db
            .query("model_costs")
            .withIndex("by_model", (q) => q.eq("model", model))
            .collect();

        const match = exact.find((row) => row.kind === kind && row.active);
        return match?.cost_eur ?? 0;
    },
});

export const upsertModelCost = mutation({
    args: {
        admin_email: v.string(),
        model: v.string(),
        kind: v.string(),
        cost_eur: v.number(),
        comment: v.optional(v.string()),
        active: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const model = args.model.trim();
        const kind = normalizeKind(args.kind);
        const now = new Date().toISOString();

        const existing = await ctx.db
            .query("model_costs")
            .withIndex("by_model", (q) => q.eq("model", model))
            .collect();
        const same = existing.find((row) => row.kind === kind);

        if (same) {
            await ctx.db.patch(same._id, {
                cost_eur: Math.max(0, args.cost_eur),
                comment: args.comment?.trim() || undefined,
                active: args.active ?? true,
                updated_at: now,
                updated_by: args.admin_email,
            });
            return same._id;
        }

        return await ctx.db.insert("model_costs", {
            model,
            kind,
            cost_eur: Math.max(0, args.cost_eur),
            comment: args.comment?.trim() || undefined,
            active: args.active ?? true,
            created_at: now,
            updated_at: now,
            updated_by: args.admin_email,
        });
    },
});

export const syncModelCatalog = mutation({
    args: {
        admin_email: v.string(),
        intelligence_models: v.array(v.string()),
        image_models: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const now = new Date().toISOString();
        const ensureRows = async (models: string[], kind: "intelligence" | "image") => {
            for (const raw of models) {
                const model = raw.trim();
                if (!model) continue;

                const existing = await ctx.db
                    .query("model_costs")
                    .withIndex("by_model", (q) => q.eq("model", model))
                    .collect();
                const same = existing.find((row) => row.kind === kind);
                if (!same) {
                    await ctx.db.insert("model_costs", {
                        model,
                        kind,
                        cost_eur: 0,
                        comment: undefined,
                        active: true,
                        created_at: now,
                        updated_at: now,
                        updated_by: args.admin_email,
                    });
                }
            }
        };

        await ensureRows(args.intelligence_models, "intelligence");
        await ensureRows(args.image_models, "image");

        return { success: true };
    },
});

export const listModelCosts = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        const rows = await ctx.db.query("model_costs").collect();
        const kindRank = (kind: string) => (kind === "image" ? 0 : 1);
        return rows.sort((a, b) => {
            const byKind = kindRank(a.kind) - kindRank(b.kind);
            if (byKind !== 0) return byKind;

            const byCost = (a.cost_eur || 0) - (b.cost_eur || 0);
            if (byCost !== 0) return byCost;

            return a.model.localeCompare(b.model);
        });
    },
});

export const deleteModelCost = mutation({
    args: {
        admin_email: v.string(),
        id: v.id("model_costs"),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const logEconomicEvent = mutation({
    args: {
        flow_id: v.optional(v.string()),
        phase: v.string(),
        model: v.string(),
        kind: v.string(),
        user_clerk_id: v.optional(v.string()),
        user_email: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const model = args.model.trim();
        const kind = normalizeKind(args.kind);
        const now = new Date().toISOString();

        const exact = await ctx.db
            .query("model_costs")
            .withIndex("by_model", (q) => q.eq("model", model))
            .collect();
        let match = exact.find((row) => row.kind === kind && row.active);

        // Auto-register unknown models at 0 EUR so admin can price them later.
        if (!match && model) {
            const id = await ctx.db.insert("model_costs", {
                model,
                kind,
                cost_eur: 0,
                comment: undefined,
                active: true,
                created_at: now,
                updated_at: now,
                updated_by: "system:auto",
            });
            match = await ctx.db.get(id) ?? undefined;
        }
        const estimatedCost = match?.cost_eur ?? 0;
        let cumulativeCost = estimatedCost;

        if (args.flow_id) {
            const flowEvents = await ctx.db
                .query("economic_audit_events")
                .withIndex("by_flow", (q) => q.eq("flow_id", args.flow_id as string))
                .collect();

            const previousFlowCost = flowEvents.reduce((acc, event) => acc + (event.estimated_cost_eur || 0), 0);
            cumulativeCost = previousFlowCost + estimatedCost;
        }

        await ctx.db.insert("economic_audit_events", {
            flow_id: args.flow_id,
            phase: args.phase,
            model,
            kind,
            estimated_cost_eur: estimatedCost,
            cumulative_cost_eur: cumulativeCost,
            user_clerk_id: args.user_clerk_id,
            user_email: args.user_email?.trim() || undefined,
            metadata: args.metadata,
            created_at: now,
        });

        return { success: true, estimated_cost_eur: estimatedCost, cumulative_cost_eur: cumulativeCost };
    },
});

export const clearEconomicEvents = mutation({
    args: {
        admin_email: v.string(),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const rows = await ctx.db.query("economic_audit_events").collect();
        for (const row of rows) {
            await ctx.db.delete(row._id);
        }

        return { success: true, deleted: rows.length };
    },
});

export const listEconomicEvents = query({
    args: {
        admin_email: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const events = await ctx.db
            .query("economic_audit_events")
            .order("desc")
            .take(args.limit ?? 200);

        const enriched = await Promise.all(events.map(async (event) => {
            let email = event.user_email || "";
            if (!email && event.user_clerk_id) {
                const user = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerk_id", event.user_clerk_id as string))
                    .first();
                email = user?.email || "";
            }
            return {
                ...event,
                resolved_user_email: email || "Unknown",
            };
        }));

        return enriched;
    },
});

export const getEconomicSummary = query({
    args: {
        admin_email: v.string(),
        days: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await requireAdmin(ctx);

        const days = Math.max(1, Math.min(args.days ?? 30, 365));
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const events = await ctx.db
            .query("economic_audit_events")
            .withIndex("by_created", (q) => q.gte("created_at", cutoff))
            .collect();

        const totalCost = events.reduce((acc, item) => acc + (item.estimated_cost_eur || 0), 0);
        const totalCalls = events.length;

        const byKind = events.reduce<Record<string, { calls: number; cost: number }>>((acc, event) => {
            const key = event.kind || "unknown";
            if (!acc[key]) acc[key] = { calls: 0, cost: 0 };
            acc[key].calls += 1;
            acc[key].cost += event.estimated_cost_eur || 0;
            return acc;
        }, {});

        const byModel = events.reduce<Record<string, { calls: number; cost: number }>>((acc, event) => {
            const key = event.model || "unknown";
            if (!acc[key]) acc[key] = { calls: 0, cost: 0 };
            acc[key].calls += 1;
            acc[key].cost += event.estimated_cost_eur || 0;
            return acc;
        }, {});

        const byFlow = events.reduce<Record<string, { calls: number; cost: number }>>((acc, event) => {
            const key = event.flow_id || "no-flow";
            if (!acc[key]) acc[key] = { calls: 0, cost: 0 };
            acc[key].calls += 1;
            acc[key].cost += event.estimated_cost_eur || 0;
            return acc;
        }, {});

        return {
            days,
            totalCalls,
            totalCost,
            byKind,
            byModel,
            byFlow,
        };
    },
});
