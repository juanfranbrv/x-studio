import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSameUser, requireAdmin, assertInternalAccess } from "./lib/authz";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];

// Helper: get a setting value with fallback
async function getSetting(ctx: MutationCtx | QueryCtx, key: string, fallback: number): Promise<number> {
    const setting = await ctx.db
        .query("app_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
    return setting?.value ?? fallback;
}

async function resolveUserAccess(ctx: MutationCtx | QueryCtx, email: string) {
    const emailLower = email.toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(emailLower);

    const betaRequest = await ctx.db
        .query("beta_requests")
        .withIndex("by_email", (q) => q.eq("email", emailLower))
        .first();

    if (isAdmin) {
        return { role: "admin" as const, status: "active" as const, approved: true };
    }

    if (betaRequest?.status === "approved") {
        return { role: "beta" as const, status: "active" as const, approved: true };
    }

    return { role: "user" as const, status: "waitlist" as const, approved: false };
}

function resolveExistingUserAccess(
    existing: Doc<"users">,
    access: { role: "user" | "beta" | "admin"; status: "waitlist" | "active"; approved: boolean }
) {
    // If user has been manually activated/suspended in admin, never downgrade from Clerk sync.
    if (!access.approved && (existing.status === "active" || existing.status === "suspended")) {
        return { role: existing.role, status: existing.status, approved: existing.status === "active" };
    }
    return access;
}

async function migrateUserOwnershipIfNeeded(
    ctx: MutationCtx,
    oldClerkId: string,
    newClerkId: string,
    email: string
) {
    if (!oldClerkId || !newClerkId || oldClerkId === newClerkId) return;

    const [brandDNA, legacyBrands, presets, feedbackItems] = await Promise.all([
        ctx.db
            .query("brand_dna")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", oldClerkId))
            .collect(),
        ctx.db
            .query("brands")
            .withIndex("by_owner", (q) => q.eq("owner_id", oldClerkId))
            .collect(),
        ctx.db
            .query("presets")
            .withIndex("by_user", (q) => q.eq("userId", oldClerkId))
            .collect(),
        ctx.db
            .query("feedback")
            .withIndex("by_user", (q) => q.eq("userId", oldClerkId))
            .collect(),
    ]);

    await Promise.all([
        ...brandDNA.map((item) => ctx.db.patch(item._id, { clerk_user_id: newClerkId })),
        ...legacyBrands.map((item) => ctx.db.patch(item._id, { owner_id: newClerkId })),
        ...presets.map((item) => ctx.db.patch(item._id, { userId: newClerkId })),
        ...feedbackItems.map((item) => ctx.db.patch(item._id, { userId: newClerkId, userEmail: email })),
    ]);
}

async function findUserByEmail(ctx: MutationCtx, email: string) {
    const emailLower = email.toLowerCase().trim();
    return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailLower))
        .first();
}

function buildReferralBase(email: string) {
    const localPart = email.toLowerCase().trim().split('@')[0] || 'studio'
    const sanitized = localPart.toUpperCase().replace(/[^A-Z0-9]/g, '')
    return (sanitized || 'STUDIO').slice(0, 6)
}

async function createUniqueReferralCode(ctx: MutationCtx, email: string) {
    const base = buildReferralBase(email)

    for (let attempt = 0; attempt < 12; attempt += 1) {
        const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
        const code = `${base}${suffix}`.slice(0, 10)
        const existing = await ctx.db
            .query('users')
            .withIndex('by_referral_code', (q) => q.eq('referral_code', code))
            .first()

        if (!existing) {
            return code
        }
    }

    throw new Error('Could not allocate referral code')
}

async function ensureUserReferralCode(ctx: MutationCtx, user: Doc<"users">) {
    if (user.referral_code) return user.referral_code

    const referralCode = await createUniqueReferralCode(ctx, user.email)
    await ctx.db.patch(user._id, { referral_code: referralCode })
    return referralCode
}

async function findUsersByEmail(ctx: MutationCtx, email: string) {
    const emailLower = email.toLowerCase().trim();
    return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailLower))
        .collect();
}

async function reconcileUsersByEmail(
    ctx: MutationCtx,
    targetUser: Doc<"users">,
    newClerkId: string,
    email: string
) {
    const matches = await findUsersByEmail(ctx, email);
    const duplicates = matches.filter((user) => user._id !== targetUser._id);

    if (duplicates.length === 0) {
        const normalizedEmail = email.toLowerCase().trim();
        if (targetUser.clerk_id !== newClerkId || targetUser.email !== normalizedEmail) {
            await ctx.db.patch(targetUser._id, { clerk_id: newClerkId, email: normalizedEmail });
            return { ...targetUser, clerk_id: newClerkId, email: normalizedEmail };
        }
        return targetUser;
    }

    let maxCredits = targetUser.credits || 0;
    let fallbackCurrentBrand = targetUser.current_brand_id;

    for (const duplicate of duplicates) {
        maxCredits = Math.max(maxCredits, duplicate.credits || 0);
        if (!fallbackCurrentBrand && duplicate.current_brand_id) {
            fallbackCurrentBrand = duplicate.current_brand_id;
        }

        await migrateUserOwnershipIfNeeded(ctx, duplicate.clerk_id, newClerkId, email);

        const txs = await ctx.db
            .query("credit_transactions")
            .withIndex("by_user", (q) => q.eq("user_id", duplicate._id))
            .collect();
        const referredUsers = await ctx.db
            .query("users")
            .withIndex("by_referred_by_user_id", (q) => q.eq("referred_by_user_id", duplicate._id))
            .collect();
        const referralsAsReferrer = await ctx.db
            .query("referrals")
            .withIndex("by_referrer_user_id", (q) => q.eq("referrer_user_id", duplicate._id))
            .collect();
        const referralsAsReferred = await ctx.db
            .query("referrals")
            .withIndex("by_referred_user_id", (q) => q.eq("referred_user_id", duplicate._id))
            .collect();
        const rewardsAsReferrer = await ctx.db
            .query("referral_rewards")
            .withIndex("by_referrer_user_id", (q) => q.eq("referrer_user_id", duplicate._id))
            .collect();
        const rewardsAsReferred = await ctx.db
            .query("referral_rewards")
            .withIndex("by_referred_user_id", (q) => q.eq("referred_user_id", duplicate._id))
            .collect();
        await Promise.all(txs.map((tx) => ctx.db.patch(tx._id, { user_id: targetUser._id })));
        await Promise.all(referredUsers.map((item) => ctx.db.patch(item._id, { referred_by_user_id: targetUser._id })));
        await Promise.all(referralsAsReferrer.map((item) => ctx.db.patch(item._id, { referrer_user_id: targetUser._id })));
        await Promise.all(referralsAsReferred.map((item) => ctx.db.patch(item._id, { referred_user_id: targetUser._id })));
        await Promise.all(rewardsAsReferrer.map((item) => ctx.db.patch(item._id, { referrer_user_id: targetUser._id })));
        await Promise.all(rewardsAsReferred.map((item) => ctx.db.patch(item._id, { referred_user_id: targetUser._id })));

        await ctx.db.delete(duplicate._id);
    }

    const normalizedEmail = email.toLowerCase().trim();
    await ctx.db.patch(targetUser._id, {
        clerk_id: newClerkId,
        email: normalizedEmail,
        credits: maxCredits,
        current_brand_id: fallbackCurrentBrand,
    });

    return {
        ...targetUser,
        clerk_id: newClerkId,
        email: normalizedEmail,
        credits: maxCredits,
        current_brand_id: fallbackCurrentBrand,
    };
}

async function updateUserAccessAndCredits(
    ctx: MutationCtx,
    user: Doc<"users">,
    access: { role: "user" | "beta" | "admin"; status: "waitlist" | "active"; approved: boolean },
    email: string,
    reason: string
) {
    const effectiveAccess = resolveExistingUserAccess(user, access);
    const wasApproved = user.status === "active";
    const willBeApproved = effectiveAccess.status === "active";
    const creditsToGrant = !wasApproved && willBeApproved
        ? await getSetting(ctx, "beta_initial_credits", 100)
        : 0;
    const nextCredits = creditsToGrant > 0
        ? (user.credits || 0) + creditsToGrant
        : user.credits;

    await ctx.db.patch(user._id, {
        email,
        role: effectiveAccess.role,
        status: effectiveAccess.status,
        credits: nextCredits,
    });

    if (creditsToGrant > 0) {
        await ctx.db.insert("credit_transactions", {
            user_id: user._id,
            type: "grant",
            amount: creditsToGrant,
            balance_after: nextCredits,
            metadata: { reason },
            created_at: new Date().toISOString(),
        });
    }

    return { effectiveAccess, nextCredits };
}

export const getUser = query({
    args: { clerk_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_id);
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();
    },
});

export const setCurrentBrand = mutation({
    args: { clerk_id: v.string(), brandId: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_id);
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();
        // Primer acceso: la fila de users puede no existir todavia por una carrera de inicializacion.
        // Evitamos error ruidoso y dejamos que el cliente reintente tras upsertUser.
        if (!user) {
            return { success: false, reason: "user_not_found" as const };
        }

        const brand = await ctx.db.get(args.brandId as Id<"brand_dna">);
        if (!brand) throw new Error("Brand kit not found");
        if (brand.clerk_user_id !== args.clerk_id) {
            throw new Error("Unauthorized brand selection");
        }

        await ctx.db.patch(user._id, { current_brand_id: args.brandId });
        return { success: true };
    },
});

// Query: get user's credit balance and status
export const getCredits = query({
    args: { clerk_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_id);
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();

        if (!user) return null;

        const lowThreshold = await getSetting(ctx, "low_credits_threshold", 10);

        return {
            credits: user.credits,
            isLow: user.credits < lowThreshold,
            status: user.status,
            role: user.role,
        };
    },
});

// Mutation: consume credits when generating
export const consumeCredits = mutation({
    args: {
        clerk_id: v.string(),
        amount: v.optional(v.number()), // If not provided, uses credits_per_generation setting
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_id);
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();

        if (!user) throw new Error("User not found");
        if (user.status !== "active") throw new Error("User not active");

        const creditsToConsume = args.amount ?? await getSetting(ctx, "credits_per_generation", 1);

        if (user.credits < creditsToConsume) throw new Error("Insufficient credits");

        const newBalance = user.credits - creditsToConsume;
        const lowThreshold = await getSetting(ctx, "low_credits_threshold", 10);

        await ctx.db.patch(user._id, { credits: newBalance });

        await ctx.db.insert("credit_transactions", {
            user_id: user._id,
            type: "consume",
            amount: -creditsToConsume,
            balance_after: newBalance,
            metadata: args.metadata,
            created_at: new Date().toISOString(),
        });

        return { success: true, newBalance, isLow: newBalance < lowThreshold };
    },
});

export const upsertUser = mutation({
    args: {
        clerk_id: v.string(),
        email: v.string(),
    },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_id);
        const emailLower = args.email.toLowerCase().trim();
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();

        const access = await resolveUserAccess(ctx, args.email);

        if (existing) {
            const reconciled = await reconcileUsersByEmail(ctx, existing, args.clerk_id, emailLower);
            await updateUserAccessAndCredits(ctx, reconciled, access, emailLower, "Activation after beta approval");
            await ensureUserReferralCode(ctx, reconciled);
            return reconciled._id;
        }

        const existingByEmail = await findUserByEmail(ctx, emailLower);
        if (existingByEmail) {
            const oldClerkId = existingByEmail.clerk_id;
            if (oldClerkId !== args.clerk_id) {
                await migrateUserOwnershipIfNeeded(ctx, oldClerkId, args.clerk_id, emailLower);
            }
            const reconciled = await reconcileUsersByEmail(ctx, existingByEmail, args.clerk_id, emailLower);
            await updateUserAccessAndCredits(ctx, reconciled, access, emailLower, "Activation after beta approval");
            await ensureUserReferralCode(ctx, reconciled);
            return reconciled._id;
        }

        const initialCredits = access.approved
            ? await getSetting(ctx, "beta_initial_credits", 100)
            : 0;

        const userId = await ctx.db.insert("users", {
            clerk_id: args.clerk_id,
            email: emailLower,
            referral_code: await createUniqueReferralCode(ctx, emailLower),
            created_at: new Date().toISOString(),
            credits: initialCredits,
            status: access.status,
            role: access.role,
        });

        if (initialCredits > 0) {
            await ctx.db.insert("credit_transactions", {
                user_id: userId,
                type: "grant",
                amount: initialCredits,
                balance_after: initialCredits,
                metadata: { reason: "Activation on first login" },
                created_at: new Date().toISOString(),
            });
        }

        // TODO: Remove this block after vicentbriva@gmail.com has signed up
        // One-time auto-provisioning: clone brand kit for specific new users
        const PROVISIONING_MAP: Record<string, string> = {
            "vicentbriva@gmail.com": "j97ewaqm418zrvb3qq6q25xy3x7yekmk", // Awordz brand from juanfranbrv
        };
        const sourceBrandId = PROVISIONING_MAP[emailLower];
        if (sourceBrandId) {
            try {
                const source = await ctx.db.get(sourceBrandId as Id<"brand_dna">);
                if (source) {
                    const rawData = { ...(source as Doc<"brand_dna">) } as Record<string, unknown>;
                    delete rawData._id;
                    delete rawData._creationTime;
                    const clonedBrandId = await ctx.db.insert("brand_dna", {
                        ...(rawData as Omit<Doc<"brand_dna">, "_id" | "_creationTime">),
                        clerk_user_id: args.clerk_id,
                        updated_at: new Date().toISOString(),
                    });
                    await ctx.db.patch(userId, { current_brand_id: clonedBrandId });
                }
            } catch (e) {
                console.error("[upsertUser] Auto-provisioning failed:", e);
            }
        }

        return userId;
    },
});
export const syncUserFromClerkWebhook = mutation({
    args: {
        clerk_id: v.string(),
        email: v.string(),
        access_key: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        assertInternalAccess(args.access_key ?? "");
        const emailLower = args.email.toLowerCase().trim();
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();

        const access = await resolveUserAccess(ctx, emailLower);
        const initialCredits = access.approved
            ? await getSetting(ctx, "beta_initial_credits", 100)
            : 0;

        if (existing) {
            const reconciled = await reconcileUsersByEmail(ctx, existing, args.clerk_id, emailLower);
            const { effectiveAccess } = await updateUserAccessAndCredits(
                ctx,
                reconciled,
                access,
                emailLower,
                "Clerk webhook beta approval"
            );
            await ensureUserReferralCode(ctx, reconciled);
            return { action: "updated", userId: reconciled._id, role: effectiveAccess.role, status: effectiveAccess.status };
        }

        const existingByEmail = await findUserByEmail(ctx, emailLower);
        if (existingByEmail) {
            const oldClerkId = existingByEmail.clerk_id;
            if (oldClerkId !== args.clerk_id) {
                await migrateUserOwnershipIfNeeded(ctx, oldClerkId, args.clerk_id, emailLower);
            }
            const reconciled = await reconcileUsersByEmail(ctx, existingByEmail, args.clerk_id, emailLower);
            const { effectiveAccess } = await updateUserAccessAndCredits(
                ctx,
                reconciled,
                access,
                emailLower,
                "Clerk webhook beta approval"
            );
            await ensureUserReferralCode(ctx, reconciled);
            return { action: "updated", userId: reconciled._id, role: effectiveAccess.role, status: effectiveAccess.status };
        }

        const userId = await ctx.db.insert("users", {
            clerk_id: args.clerk_id,
            email: emailLower,
            referral_code: await createUniqueReferralCode(ctx, emailLower),
            created_at: new Date().toISOString(),
            credits: initialCredits,
            status: access.status,
            role: access.role,
        });

        if (initialCredits > 0) {
            await ctx.db.insert("credit_transactions", {
                user_id: userId,
                type: "grant",
                amount: initialCredits,
                balance_after: initialCredits,
                metadata: { reason: "Clerk webhook activation" },
                created_at: new Date().toISOString(),
            });
        }

        return { action: "created", userId, role: access.role, status: access.status };
    },
});

export const deleteUserByClerkId = mutation({
    args: { clerk_id: v.string(), access_key: v.optional(v.string()) },
    handler: async (ctx, args) => {
        assertInternalAccess(args.access_key ?? "");
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();

        if (!user) return { success: true, deleted: false };

        const transactions = await ctx.db
            .query("credit_transactions")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
            .collect();

        for (const tx of transactions) {
            await ctx.db.delete(tx._id);
        }

        await ctx.db.delete(user._id);

        return { success: true, deleted: true };
    },
});

export const reconcileUserByEmail = mutation({
    args: {
        admin_email: v.string(),
        email: v.string(),
    },
    handler: async (ctx, args) => {
        // El rol admin se verifica contra la identidad real del JWT,
        // nunca contra el argumento admin_email (que se conserva por compatibilidad).
        await requireAdmin(ctx);

        const emailLower = args.email.toLowerCase().trim();
        const matches = await findUsersByEmail(ctx, emailLower);
        if (matches.length <= 1) {
            return { success: true, message: "No duplicates found", count: matches.length };
        }

        const target =
            matches.find((user) => user.role === "admin") ??
            matches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        const beforeCount = matches.length;
        await reconcileUsersByEmail(ctx, target, target.clerk_id, emailLower);
        const after = await findUsersByEmail(ctx, emailLower);

        return {
            success: true,
            message: "Reconciled",
            beforeCount,
            afterCount: after.length,
            targetUserId: target._id,
            targetClerkId: target.clerk_id,
        };
    },
});

// Mutation: mark onboarding as completed
export const completeOnboarding = mutation({
    args: { clerk_id: v.string() },
    handler: async (ctx, args) => {
        await requireSameUser(ctx, args.clerk_id);
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .first();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, {
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
        });

        return { success: true };
    },
});


