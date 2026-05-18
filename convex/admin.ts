import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Admin emails - configurable, but this is the initial bootstrap list
const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];

// Helper: check if user is admin
const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

// ============================================
// SETTINGS MANAGEMENT
// ============================================

// Query: get all settings
export const getSettings = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        return await ctx.db.query("app_settings").collect();
    },
});

// Query: get a single setting value
export const getSetting = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const setting = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();
        return setting?.value ?? null;
    },
});

// Mutation: update a setting
export const updateSetting = mutation({
    args: {
        admin_email: v.string(),
        key: v.string(),
        value: v.any(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const existing = await ctx.db
            .query("app_settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                description: args.description,
                updated_at: new Date().toISOString(),
                updated_by: args.admin_email,
            });
            return existing._id;
        }

        return await ctx.db.insert("app_settings", {
            key: args.key,
            value: args.value,
            description: args.description,
            updated_at: new Date().toISOString(),
            updated_by: args.admin_email,
        });
    },
});

// Mutation: initialize default settings (run once)
export const initializeSettings = mutation({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const defaults = [
            { key: "carousel_video_slide_duration_ms", value: 4000, description: "Duracion base en milisegundos para cada slide del video del carrusel" },
            { key: "carousel_video_last_slide_duration_ms", value: 6000, description: "Duracion en milisegundos para la ultima slide del video del carrusel" },
            { key: "beta_initial_credits", value: 100, description: "Créditos iniciales para beta testers" },
            { key: "low_credits_threshold", value: 10, description: "Umbral para alerta de créditos bajos" },
            { key: "credits_per_generation", value: 1, description: "Créditos consumidos por generación" },
            { key: "model_image_generation", value: "wisdom/gemini-3-pro-image-preview", description: "Modelo por defecto para generación de imagen" },
            { key: "model_intelligence", value: "wisdom/gemini-3-flash-preview", description: "Modelo por defecto para inteligencia y análisis" },
            { key: "provider_google_api_key", value: "", description: "API key de Google para modelos de texto google/*" },
            { key: "provider_wisdom_api_key", value: "", description: "API key de Wisdom para modelos wisdom/*" },
            { key: "provider_openai_api_key", value: "", description: "API key de OpenAI para modelos openai/*" },
            { key: "provider_naga_api_key", value: "", description: "API key de NagaAI para modelos naga/*" },
            { key: "provider_replicate_api_key", value: "", description: "API key de Replicate para modelos replicate/*" },
            { key: "provider_atlas_api_key", value: "", description: "API key de Atlas para modelos atlas/*" },
            { key: "replace_module_enabled", value: false, description: "Activa o desactiva el modulo experimental Replace en la navegación del estudio" },
            { key: "referral_signup_reward_credits", value: 5, description: "Creditos fijos por alta con referido" },
            { key: "referral_purchase_reward_percentage", value: 50, description: "Porcentaje de creditos del pack que gana quien invita" },
        ];

        for (const setting of defaults) {
            const existing = await ctx.db
                .query("app_settings")
                .withIndex("by_key", (q) => q.eq("key", setting.key))
                .first();

            if (!existing) {
                await ctx.db.insert("app_settings", {
                    ...setting,
                    updated_at: new Date().toISOString(),
                    updated_by: args.admin_email,
                });
            }
        }

        return { success: true };
    },
});

// ============================================
// USER MANAGEMENT
// ============================================

// Query: list all users
export const listUsers = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        const users = await ctx.db.query("users").collect();
        return users.map(u => ({
            _id: u._id,
            email: u.email,
            credits: u.credits,
            status: u.status,
            role: u.role,
            created_at: u.created_at,
        }));
    },
});

// Mutation: activate user (from waitlist to active)
export const activateUser = mutation({
    args: {
        admin_email: v.string(),
        user_id: v.id("users"),
        credits: v.optional(v.number()), // If not provided, uses beta_initial_credits setting
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const user = await ctx.db.get(args.user_id);
        if (!user) throw new Error("User not found");

        // Get initial credits from settings or use provided value
        let creditsToGrant = args.credits;
        if (creditsToGrant === undefined) {
            const setting = await ctx.db
                .query("app_settings")
                .withIndex("by_key", (q) => q.eq("key", "beta_initial_credits"))
                .first();
            creditsToGrant = (setting?.value as number) ?? 100;
        }

        const newBalance = user.credits + creditsToGrant;

        await ctx.db.patch(args.user_id, {
            status: "active",
            role: "beta",
            credits: newBalance,
        });

        const emailLower = user.email.toLowerCase().trim();
        const betaRequest = await ctx.db
            .query("beta_requests")
            .withIndex("by_email", (q) => q.eq("email", emailLower))
            .first();

        if (betaRequest) {
            await ctx.db.patch(betaRequest._id, {
                status: "approved",
                processed_at: new Date().toISOString(),
                processed_by: args.admin_email,
            });
        } else {
            await ctx.db.insert("beta_requests", {
                email: emailLower,
                status: "approved",
                created_at: new Date().toISOString(),
                processed_at: new Date().toISOString(),
                processed_by: args.admin_email,
            });
        }

        await ctx.db.insert("credit_transactions", {
            user_id: args.user_id,
            type: "grant",
            amount: creditsToGrant,
            balance_after: newBalance,
            metadata: { admin_email: args.admin_email, reason: "Beta activation" },
            created_at: new Date().toISOString(),
        });

        return { success: true, newBalance };
    },
});

// Mutation: suspend user
export const suspendUser = mutation({
    args: {
        admin_email: v.string(),
        user_id: v.id("users"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const user = await ctx.db.get(args.user_id);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.user_id, { status: "suspended" });

        return { success: true };
    },
});

// Mutation: delete user (permanent)
export const deleteUser = mutation({
    args: {
        admin_email: v.string(),
        user_id: v.id("users"),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const user = await ctx.db.get(args.user_id);
        if (!user) throw new Error("User not found");

        // Prevent deleting yourself (admin)
        if (user.email.toLowerCase() === args.admin_email.toLowerCase()) {
            throw new Error("No puedes eliminarte a ti mismo");
        }

        // Revoke beta access - update beta_request to "rejected" to prevent re-login
        const emailLower = user.email.toLowerCase().trim();
        const betaRequest = await ctx.db
            .query("beta_requests")
            .withIndex("by_email", (q) => q.eq("email", emailLower))
            .first();

        if (betaRequest) {
            await ctx.db.patch(betaRequest._id, {
                status: "rejected",
                processed_at: new Date().toISOString(),
                processed_by: args.admin_email,
            });
        }

        // Delete all credit transactions for this user
        const transactions = await ctx.db
            .query("credit_transactions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .collect();

        for (const tx of transactions) {
            await ctx.db.delete(tx._id);
        }

        // Delete all brands for this user (use clerk_id as owner_id)
        const brands = await ctx.db
            .query("brands")
            .withIndex("by_owner", (q) => q.eq("owner_id", user.clerk_id))
            .collect();

        for (const brand of brands) {
            await ctx.db.delete(brand._id);
        }

        // Delete the user
        await ctx.db.delete(args.user_id);

        return { success: true, deletedEmail: user.email, betaRevoked: !!betaRequest };
    },
});

// Mutation: adjust user credits (add or remove)
export const adjustCredits = mutation({
    args: {
        admin_email: v.string(),
        user_id: v.id("users"),
        amount: v.number(), // Positive to add, negative to remove
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const user = await ctx.db.get(args.user_id);
        if (!user) throw new Error("User not found");

        const newBalance = Math.max(0, user.credits + args.amount);

        await ctx.db.patch(args.user_id, { credits: newBalance });

        await ctx.db.insert("credit_transactions", {
            user_id: args.user_id,
            type: "admin_adjust",
            amount: args.amount,
            balance_after: newBalance,
            metadata: { admin_email: args.admin_email, reason: args.reason },
            created_at: new Date().toISOString(),
        });

        return { success: true, newBalance };
    },
});

// ============================================
// TRANSACTIONS / AUDIT
// ============================================

// Query: get transactions for a user
export const getUserTransactions = query({
    args: {
        admin_email: v.string(),
        user_id: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        return await ctx.db
            .query("credit_transactions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .order("desc")
            .take(args.limit ?? 50);
    },
});

// Query: get all recent transactions
export const getRecentTransactions = query({
    args: {
        admin_email: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const transactions = await ctx.db
            .query("credit_transactions")
            .order("desc")
            .take(args.limit ?? 100);

        // Enrich with user emails
        const enriched = await Promise.all(
            transactions.map(async (tx) => {
                const user = await ctx.db.get(tx.user_id);
                return {
                    ...tx,
                    user_email: user?.email ?? "Unknown",
                };
            })
        );

        return enriched;
    },
});

// Query: get dashboard stats
export const getDashboardStats = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const users = await ctx.db.query("users").collect();
        const betaRequests = await ctx.db.query("beta_requests").collect();

        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === "active").length,
            waitlistUsers: users.filter(u => u.status === "waitlist").length,
            suspendedUsers: users.filter(u => u.status === "suspended").length,
            totalCreditsInCirculation: users.reduce((sum, u) => sum + u.credits, 0),
            pendingBetaRequests: betaRequests.filter(r => r.status === "pending").length,
        };

        return stats;
    },
});

// ============================================
// BETA ACCESS REQUESTS
// ============================================

// Public: submit a beta access request
export const submitBetaRequest = mutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const email = args.email.toLowerCase().trim();

        // Check if already requested
        const existing = await ctx.db
            .query("beta_requests")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();

        if (existing) {
            return { success: true, status: existing.status, message: "Ya tienes una solicitud registrada" };
        }

        // Check if already a user
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();

        if (existingUser) {
            return { success: true, status: "approved", message: "Ya tienes una cuenta" };
        }

        await ctx.db.insert("beta_requests", {
            email,
            status: "pending",
            created_at: new Date().toISOString(),
        });

        return { success: true, status: "pending", message: "Solicitud registrada" };
    },
});

// Query: check if email has beta access
export const checkBetaAccess = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const email = args.email.toLowerCase().trim();

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();

        if (existingUser) {
            if (existingUser.status === "active") {
                return { hasAccess: true, status: existingUser.role };
            }

            if (existingUser.status === "suspended") {
                return { hasAccess: false, status: "suspended" };
            }

            return { hasAccess: false, status: "pending" };
        }

        // Check beta_requests first
        const request = await ctx.db
            .query("beta_requests")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();

        if (request?.status === "approved") {
            return { hasAccess: true, status: "approved" };
        }

        if (request?.status === "rejected") {
            return { hasAccess: false, status: "rejected" };
        }

        if (request?.status === "pending") {
            return { hasAccess: false, status: "pending" };
        }

        // Check if admin
        if (isAdmin(email)) {
            return { hasAccess: true, status: "admin" };
        }

        return { hasAccess: false, status: "none" };
    },
});

// Admin: list beta requests
export const listBetaRequests = query({
    args: { admin_email: v.string() },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        return await ctx.db
            .query("beta_requests")
            .order("desc")
            .collect();
    },
});

// Admin: approve beta request
export const approveBetaRequest = mutation({
    args: {
        admin_email: v.string(),
        request_id: v.id("beta_requests"),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const request = await ctx.db.get(args.request_id);
        if (!request) throw new Error("Request not found");

        // Update request status
        await ctx.db.patch(args.request_id, {
            status: "approved",
            processed_at: new Date().toISOString(),
            processed_by: args.admin_email,
        });

        // Note: User will be created when they log in with Clerk
        // The landing page will detect approved status and let them proceed

        return { success: true, email: request.email };
    },
});

// Admin: reject beta request
export const rejectBetaRequest = mutation({
    args: {
        admin_email: v.string(),
        request_id: v.id("beta_requests"),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

        const request = await ctx.db.get(args.request_id);
        if (!request) throw new Error("Request not found");

        await ctx.db.patch(args.request_id, {
            status: "rejected",
            processed_at: new Date().toISOString(),
            processed_by: args.admin_email,
        });

        return { success: true };
    },
});

// Admin: delete beta request
export const deleteBetaRequest = mutation({
    args: {
        admin_email: v.string(),
        request_id: v.id("beta_requests"),
    },
    handler: async (ctx, args) => {
        if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
        await ctx.db.delete(args.request_id);
        return { success: true };
    },
});

