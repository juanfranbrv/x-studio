import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { authedFetchQuery, authedFetchMutation } from "@/lib/convex-server";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { BILLING_PACKS, getBillingPackDefinition } from "@/lib/billing";
import { brand } from "@/lib/brand";
import { getStripe } from "@/lib/stripe";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
}

export const serverConvex = new ConvexHttpClient(convexUrl);
const stripeAccessKey = process.env.STRIPE_INTERNAL_SECRET?.trim() || "";

function requireStripeAccessKey() {
  if (!stripeAccessKey) {
    throw new Error("Missing STRIPE_INTERNAL_SECRET");
  }
  return stripeAccessKey;
}

export async function ensureConvexUser(clerkId: string) {
  let user = await authedFetchQuery(api.users.getUser, { clerk_id: clerkId });
  if (user) return user;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Authenticated user has no email");

  await authedFetchMutation(api.users.upsertUser, {
    clerk_id: clerkId,
    email,
  });

  user = await authedFetchQuery(api.users.getUser, { clerk_id: clerkId });
  if (!user) throw new Error("Could not provision user in Convex");
  return user;
}

export async function ensureDefaultBillingCatalog() {
  await serverConvex.mutation(api.billing.ensureDefaultPacksSecure, {
    access_key: requireStripeAccessKey(),
  });
  return await serverConvex.query(api.billing.listActivePacks, {});
}

export async function ensureStripeCustomerForUser(user: Doc<"users">) {
  const stripe = getStripe();
  const billingOverview = await serverConvex.query(api.billing.getUserBillingOverview, {
    clerk_id: user.clerk_id,
  });

  if (billingOverview?.customer?.stripe_customer_id) {
    return billingOverview.customer.stripe_customer_id;
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(user.clerk_id);
  const stripeCustomer = await stripe.customers.create({
    email: user.email,
    name: clerkUser.fullName || clerkUser.firstName || undefined,
    metadata: {
      clerk_id: user.clerk_id,
      convex_user_id: user._id,
    },
  });

  await serverConvex.mutation(api.billing.upsertBillingCustomerSecure, {
    access_key: requireStripeAccessKey(),
    user_id: user._id,
    clerk_id: user.clerk_id,
    email: user.email,
    stripe_customer_id: stripeCustomer.id,
    full_name: clerkUser.fullName || undefined,
  });

  return stripeCustomer.id;
}

export async function ensureStripePriceForPack(packSlug: string) {
  const stripe = getStripe();
  const pack = await serverConvex.query(api.billing.getPackBySlug, {
    slug: packSlug,
  });

  if (!pack) {
    throw new Error("Pack not found");
  }

  if (pack.stripe_price_id && pack.stripe_product_id) {
    return pack;
  }

  const fallback = getBillingPackDefinition(pack.slug);
  const product = await stripe.products.create({
    name: fallback?.slug === "trail-10" ? "Trail Pack" : fallback?.slug === "studio-30" ? "Studio Pack" : "Orbit Pack",
    description: `${pack.credits} credits for ${brand.name}`,
    metadata: {
      pack_slug: pack.slug,
      credits: String(pack.credits),
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: pack.price_cents,
    currency: pack.currency,
    metadata: {
      pack_slug: pack.slug,
      credits: String(pack.credits),
    },
  });

  await serverConvex.mutation(api.billing.upsertPackStripeRefsSecure, {
    access_key: requireStripeAccessKey(),
    slug: pack.slug,
    stripe_product_id: product.id,
    stripe_price_id: price.id,
  });

  return {
    ...pack,
    stripe_product_id: product.id,
    stripe_price_id: price.id,
  };
}

export async function syncStripeCatalog() {
  await ensureDefaultBillingCatalog();
  const synced = [];

  for (const pack of BILLING_PACKS) {
    const stripePack = await ensureStripePriceForPack(pack.slug);
    synced.push(stripePack);
  }

  return synced;
}
