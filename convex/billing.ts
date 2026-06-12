/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { requireAdmin } from "./lib/authz";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { BILLING_PACKS } from "../src/lib/billing";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase().trim());
const STRIPE_INTERNAL_SECRET = process.env.STRIPE_INTERNAL_SECRET || "";

type PurchaseStatus = "pending" | "completed" | "failed" | "refunded" | "expired";

function assertStripeAccess(accessKey: string) {
  if (!STRIPE_INTERNAL_SECRET || accessKey !== STRIPE_INTERNAL_SECRET) {
    throw new Error("Unauthorized");
  }
}

async function getUserByClerkIdOrThrow(ctx: any, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerk_id", clerkId))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}

async function getPackRecordBySlug(ctx: any, slug: string) {
  return await ctx.db
    .query("billing_packs")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .first();
}

async function getNumberSetting(ctx: any, key: string, fallback: number) {
  const setting = await ctx.db
    .query("app_settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();

  return typeof setting?.value === "number" ? setting.value : fallback;
}

async function ensureDefaultPacks(ctx: any) {
  const now = new Date().toISOString();

  for (const pack of BILLING_PACKS) {
    const existing = await getPackRecordBySlug(ctx, pack.slug);
    if (existing) {
      await ctx.db.patch(existing._id, {
        credits: pack.credits,
        price_cents: pack.priceCents,
        currency: pack.currency,
        sort_order: pack.sortOrder,
        featured: pack.featured,
        updated_at: now,
      });
      continue;
    }

    await ctx.db.insert("billing_packs", {
      slug: pack.slug,
      credits: pack.credits,
      price_cents: pack.priceCents,
      currency: pack.currency,
      sort_order: pack.sortOrder,
      active: true,
      featured: pack.featured,
      created_at: now,
      updated_at: now,
    });
  }
}

function summarizeLedger(rows: Doc<"credit_transactions">[]) {
  return rows.reduce(
    (acc, tx) => {
      if (tx.amount > 0) acc.purchased += tx.amount;
      if (tx.amount < 0) acc.spent += Math.abs(tx.amount);
      return acc;
    },
    { purchased: 0, spent: 0 }
  );
}

export const listActivePacks = query({
  args: {},
  handler: async (ctx) => {
    const packs = await ctx.db
      .query("billing_packs")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    if (packs.length === 0) {
      return BILLING_PACKS.map((pack) => ({
        _id: `fallback:${pack.slug}`,
        _creationTime: 0,
        slug: pack.slug,
        credits: pack.credits,
        price_cents: pack.priceCents,
        currency: pack.currency,
        sort_order: pack.sortOrder,
        active: true,
        featured: pack.featured,
        stripe_product_id: undefined,
        stripe_price_id: undefined,
        created_at: "",
        updated_at: "",
      }));
    }

    return packs.sort((a, b) => a.sort_order - b.sort_order);
  },
});

export const getUserBillingOverview = query({
  args: { clerk_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
      .first();

    if (!user) return null;

    const [customer, purchases, ledger] = await Promise.all([
      ctx.db.query("billing_customers").withIndex("by_user", (q) => q.eq("user_id", user._id)).first(),
      ctx.db.query("billing_purchases").withIndex("by_user_created", (q) => q.eq("user_id", user._id)).collect(),
      ctx.db.query("credit_transactions").withIndex("by_user", (q) => q.eq("user_id", user._id)).collect(),
    ]);

    const completedPurchases = purchases.filter((purchase) => purchase.status === "completed");
    const orderedPurchases = completedPurchases.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const orderedLedger = ledger.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const totals = summarizeLedger(ledger);

    return {
      user,
      customer,
      latestPurchase: orderedPurchases[0] || null,
      totalPurchased: totals.purchased,
      totalSpent: totals.spent,
      purchaseCount: orderedPurchases.length,
      portalAvailable: Boolean(customer?.stripe_customer_id),
      purchases: orderedPurchases.slice(0, 10),
      ledger: orderedLedger.slice(0, 25),
    };
  },
});

export const listUserPurchases = query({
  args: {
    clerk_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByClerkIdOrThrow(ctx, args.clerk_id);
    const purchases = await ctx.db
      .query("billing_purchases")
      .withIndex("by_user_created", (q) => q.eq("user_id", user._id))
      .collect();

    return purchases
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, args.limit ?? 20);
  },
});

export const listUserCreditLedger = query({
  args: {
    clerk_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByClerkIdOrThrow(ctx, args.clerk_id);
    const rows = await ctx.db
      .query("credit_transactions")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();

    return rows
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, args.limit ?? 50);
  },
});

export const getAdminBillingSummary = query({
  args: { admin_email: v.string() },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const [packs, purchases, customers] = await Promise.all([
      ctx.db.query("billing_packs").collect(),
      ctx.db.query("billing_purchases").collect(),
      ctx.db.query("billing_customers").collect(),
    ]);

    const completedPurchases = purchases.filter((purchase) => purchase.status === "completed");

    return {
      packs: packs.sort((a, b) => a.sort_order - b.sort_order),
      stats: {
        revenueCents: completedPurchases.reduce((sum, purchase) => sum + purchase.amount_cents, 0),
        purchaseCount: completedPurchases.length,
        payingCustomers: new Set(completedPurchases.map((purchase) => purchase.user_id)).size,
        creditsSold: completedPurchases.reduce((sum, purchase) => sum + purchase.credits, 0),
        customerCount: customers.length,
      },
      purchases: completedPurchases.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50),
    };
  },
});

export const seedDefaultPacks = mutation({
  args: { admin_email: v.string() },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    await ensureDefaultPacks(ctx);
    return { success: true };
  },
});

export const updatePack = mutation({
  args: {
    admin_email: v.string(),
    pack_id: v.id("billing_packs"),
    active: v.optional(v.boolean()),
    price_cents: v.optional(v.number()),
    credits: v.optional(v.number()),
    sort_order: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof args.active === "boolean") patch.active = args.active;
    if (typeof args.price_cents === "number") patch.price_cents = args.price_cents;
    if (typeof args.credits === "number") patch.credits = args.credits;
    if (typeof args.sort_order === "number") patch.sort_order = args.sort_order;
    if (typeof args.featured === "boolean") patch.featured = args.featured;

    await ctx.db.patch(args.pack_id, patch);
    return { success: true };
  },
});

export const getPackBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await getPackRecordBySlug(ctx, args.slug);
  },
});

export const ensureDefaultPacksSecure = mutation({
  args: { access_key: v.string() },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    await ensureDefaultPacks(ctx);
    return { success: true };
  },
});

export const upsertPackStripeRefsSecure = mutation({
  args: {
    access_key: v.string(),
    slug: v.string(),
    stripe_product_id: v.string(),
    stripe_price_id: v.string(),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const pack = await getPackRecordBySlug(ctx, args.slug);
    if (!pack) throw new Error("Pack not found");
    await ctx.db.patch(pack._id, {
      stripe_product_id: args.stripe_product_id,
      stripe_price_id: args.stripe_price_id,
      updated_at: new Date().toISOString(),
    });
    return { success: true, packId: pack._id };
  },
});

export const upsertBillingCustomerSecure = mutation({
  args: {
    access_key: v.string(),
    user_id: v.id("users"),
    clerk_id: v.string(),
    email: v.string(),
    stripe_customer_id: v.string(),
    full_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const existing = await ctx.db
      .query("billing_customers")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    const patch = {
      clerk_id: args.clerk_id,
      email: args.email,
      stripe_customer_id: args.stripe_customer_id,
      full_name: args.full_name,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("billing_customers", {
      ...patch,
      user_id: args.user_id,
      created_at: new Date().toISOString(),
    });
  },
});

export const recordCheckoutSessionSecure = mutation({
  args: {
    access_key: v.string(),
    user_id: v.id("users"),
    pack_slug: v.string(),
    credits: v.number(),
    amount_cents: v.number(),
    currency: v.string(),
    stripe_customer_id: v.string(),
    stripe_checkout_session_id: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const existing = await ctx.db
      .query("billing_purchases")
      .withIndex("by_checkout_session", (q) => q.eq("stripe_checkout_session_id", args.stripe_checkout_session_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: existing.status || "pending",
        updated_at: new Date().toISOString(),
        metadata: {
          ...(existing.metadata || {}),
          ...(args.metadata || {}),
        },
      });
      return existing._id;
    }

    return await ctx.db.insert("billing_purchases", {
      user_id: args.user_id,
      pack_slug: args.pack_slug,
      credits: args.credits,
      amount_cents: args.amount_cents,
      currency: args.currency,
      status: "pending",
      stripe_customer_id: args.stripe_customer_id,
      stripe_checkout_session_id: args.stripe_checkout_session_id,
      metadata: args.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },
});

export const finalizeCheckoutSecure = mutation({
  args: {
    access_key: v.string(),
    stripe_checkout_session_id: v.string(),
    stripe_customer_id: v.optional(v.string()),
    stripe_payment_intent_id: v.optional(v.string()),
    stripe_charge_id: v.optional(v.string()),
    stripe_invoice_id: v.optional(v.string()),
    receipt_url: v.optional(v.string()),
    invoice_url: v.optional(v.string()),
    invoice_pdf_url: v.optional(v.string()),
    amount_cents: v.number(),
    currency: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const purchase = await ctx.db
      .query("billing_purchases")
      .withIndex("by_checkout_session", (q) => q.eq("stripe_checkout_session_id", args.stripe_checkout_session_id))
      .first();

    if (!purchase) {
      throw new Error("Purchase not found for checkout session");
    }

    const user = await ctx.db.get(purchase.user_id);
    if (!user) throw new Error("User not found");

    if (purchase.status === "completed") {
      return {
        purchaseId: purchase._id,
        alreadyCompleted: true,
        userEmail: user.email,
        credits: purchase.credits,
        packSlug: purchase.pack_slug,
      };
    }

    const nextBalance = user.credits + purchase.credits;
    const txs = await ctx.db
      .query("credit_transactions")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();

    const alreadyCredited = txs.some((tx) => tx.type === "purchase" && tx.metadata?.checkout_session_id === args.stripe_checkout_session_id);

    if (!alreadyCredited) {
      await ctx.db.insert("credit_transactions", {
        user_id: user._id,
        type: "purchase",
        amount: purchase.credits,
        balance_after: nextBalance,
        metadata: {
          pack_slug: purchase.pack_slug,
          checkout_session_id: args.stripe_checkout_session_id,
          stripe_payment_intent_id: args.stripe_payment_intent_id,
        },
        created_at: new Date().toISOString(),
      });
      await ctx.db.patch(user._id, {
        credits: nextBalance,
        plan_id: purchase.pack_slug,
      });
    }

    if (user.referred_by_user_id) {
      const referral = await ctx.db
        .query("referrals")
        .withIndex("by_referred_user_id", (q) => q.eq("referred_user_id", user._id))
        .first();

      if (referral) {
        const existingReward = await ctx.db
          .query("referral_rewards")
          .withIndex("by_purchase_id", (q) => q.eq("purchase_id", purchase._id))
          .first();

        if (!existingReward) {
          const rewardPercentage = await getNumberSetting(ctx, "referral_purchase_reward_percentage", 50);
          const rewardCredits = Math.floor((purchase.credits * rewardPercentage) / 100);

          if (rewardCredits > 0) {
            const referrer = await ctx.db.get(referral.referrer_user_id);
            if (referrer) {
              const referrerBalance = (referrer.credits || 0) + rewardCredits;
              const rewardTimestamp = new Date().toISOString();

              await ctx.db.patch(referrer._id, { credits: referrerBalance });
              await ctx.db.patch(referral._id, {
                total_purchase_reward_credits: (referral.total_purchase_reward_credits || 0) + rewardCredits,
                updated_at: rewardTimestamp,
              });
              await ctx.db.insert("credit_transactions", {
                user_id: referrer._id,
                type: "referral_purchase_bonus",
                amount: rewardCredits,
                balance_after: referrerBalance,
                metadata: {
                  purchase_id: purchase._id,
                  referred_user_id: user._id,
                  checkout_session_id: args.stripe_checkout_session_id,
                },
                created_at: rewardTimestamp,
              });
              await ctx.db.insert("referral_rewards", {
                referral_id: referral._id,
                referrer_user_id: referrer._id,
                referred_user_id: user._id,
                reward_type: "purchase",
                credits_awarded: rewardCredits,
                status: "granted",
                purchase_id: purchase._id,
                metadata: {
                  checkout_session_id: args.stripe_checkout_session_id,
                },
                created_at: rewardTimestamp,
                updated_at: rewardTimestamp,
              });
            }
          }
        }
      }
    }

    await ctx.db.patch(purchase._id, {
      status: "completed",
      stripe_customer_id: args.stripe_customer_id,
      stripe_payment_intent_id: args.stripe_payment_intent_id,
      stripe_charge_id: args.stripe_charge_id,
      stripe_invoice_id: args.stripe_invoice_id,
      amount_cents: args.amount_cents,
      currency: args.currency,
      receipt_url: args.receipt_url,
      invoice_url: args.invoice_url,
      invoice_pdf_url: args.invoice_pdf_url,
      metadata: {
        ...(purchase.metadata || {}),
        ...(args.metadata || {}),
      },
      updated_at: new Date().toISOString(),
    });

    return {
      purchaseId: purchase._id,
      alreadyCompleted: false,
      userEmail: user.email,
      credits: purchase.credits,
      packSlug: purchase.pack_slug,
    };
  },
});

export const markPurchaseStatusSecure = mutation({
  args: {
    access_key: v.string(),
    stripe_checkout_session_id: v.optional(v.string()),
    stripe_payment_intent_id: v.optional(v.string()),
    status: v.string(),
    error_message: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const purchase =
      (args.stripe_checkout_session_id
        ? await ctx.db
            .query("billing_purchases")
            .withIndex("by_checkout_session", (q) => q.eq("stripe_checkout_session_id", args.stripe_checkout_session_id))
            .first()
        : null) ||
      (args.stripe_payment_intent_id
        ? await ctx.db
            .query("billing_purchases")
            .withIndex("by_payment_intent", (q) => q.eq("stripe_payment_intent_id", args.stripe_payment_intent_id))
            .first()
        : null);

    if (!purchase) return null;

    await ctx.db.patch(purchase._id, {
      status: args.status as PurchaseStatus,
      metadata: {
        ...(purchase.metadata || {}),
        ...(args.metadata || {}),
        error_message: args.error_message,
      },
      updated_at: new Date().toISOString(),
    });

    return purchase._id;
  },
});

export const markPurchaseRefundedSecure = mutation({
  args: {
    access_key: v.string(),
    stripe_charge_id: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const purchase = await ctx.db
      .query("billing_purchases")
      .withIndex("by_charge", (q) => q.eq("stripe_charge_id", args.stripe_charge_id))
      .first();

    if (!purchase || purchase.status === "refunded") {
      return null;
    }

    const user = await ctx.db.get(purchase.user_id);
    if (!user) throw new Error("User not found");

    const nextBalance = Math.max(0, user.credits - purchase.credits);
    await ctx.db.patch(user._id, { credits: nextBalance });
    await ctx.db.patch(purchase._id, {
      status: "refunded",
      metadata: {
        ...(purchase.metadata || {}),
        ...(args.metadata || {}),
      },
      updated_at: new Date().toISOString(),
    });

    await ctx.db.insert("credit_transactions", {
      user_id: user._id,
      type: "refund",
      amount: -purchase.credits,
      balance_after: nextBalance,
      metadata: {
        pack_slug: purchase.pack_slug,
        stripe_charge_id: args.stripe_charge_id,
      },
      created_at: new Date().toISOString(),
    });

    const purchaseReward = await ctx.db
      .query("referral_rewards")
      .withIndex("by_purchase_id", (q) => q.eq("purchase_id", purchase._id))
      .first();

    if (purchaseReward && purchaseReward.status === "granted") {
      const referrer = await ctx.db.get(purchaseReward.referrer_user_id);
      const referral = await ctx.db.get(purchaseReward.referral_id);
      const reversalTimestamp = new Date().toISOString();

      if (referrer) {
        const referrerBalance = Math.max(0, (referrer.credits || 0) - purchaseReward.credits_awarded);
        await ctx.db.patch(referrer._id, { credits: referrerBalance });
        await ctx.db.insert("credit_transactions", {
          user_id: referrer._id,
          type: "referral_purchase_reversal",
          amount: -purchaseReward.credits_awarded,
          balance_after: referrerBalance,
          metadata: {
            purchase_id: purchase._id,
            stripe_charge_id: args.stripe_charge_id,
          },
          created_at: reversalTimestamp,
        });
      }

      if (referral) {
        await ctx.db.patch(referral._id, {
          total_purchase_reward_credits: Math.max(0, (referral.total_purchase_reward_credits || 0) - purchaseReward.credits_awarded),
          updated_at: reversalTimestamp,
        });
      }

      await ctx.db.patch(purchaseReward._id, {
        status: "reversed",
        updated_at: reversalTimestamp,
        metadata: {
          ...(purchaseReward.metadata || {}),
          refunded_at: reversalTimestamp,
        },
      });
    }

    return purchase._id;
  },
});

export const recordStripeEventSecure = mutation({
  args: {
    access_key: v.string(),
    stripe_event_id: v.string(),
    type: v.string(),
    status: v.string(),
    stripe_object_id: v.optional(v.string()),
    related_purchase_id: v.optional(v.id("billing_purchases")),
    payload: v.optional(v.any()),
    error_message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertStripeAccess(args.access_key);
    const existing = await ctx.db
      .query("billing_events")
      .withIndex("by_stripe_event_id", (q) => q.eq("stripe_event_id", args.stripe_event_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        type: args.type,
        status: args.status,
        stripe_object_id: args.stripe_object_id,
        related_purchase_id: args.related_purchase_id,
        payload: args.payload,
        error_message: args.error_message,
        processed_at: new Date().toISOString(),
      });
      return existing._id;
    }

    return await ctx.db.insert("billing_events", {
      stripe_event_id: args.stripe_event_id,
      type: args.type,
      status: args.status,
      stripe_object_id: args.stripe_object_id,
      related_purchase_id: args.related_purchase_id,
      payload: args.payload,
      error_message: args.error_message,
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });
  },
});

export const syncPackCatalogSnapshot = mutation({
  args: { admin_email: v.string() },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    await ensureDefaultPacks(ctx);
    const packs = await ctx.db.query("billing_packs").collect();
    return packs.sort((a, b) => a.sort_order - b.sort_order);
  },
});
