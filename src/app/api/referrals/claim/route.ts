import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { api } from "@/../convex/_generated/api";
import { authedFetchMutation } from "@/lib/convex-server";
import { serverConvex } from "@/lib/billing-server";

const stripeAccessKey = process.env.STRIPE_INTERNAL_SECRET?.trim() || "";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", clearStoredCode: false }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const referralCode = String(body.code || "").trim();
    if (!referralCode) {
      return NextResponse.json({ error: "Referral code missing", clearStoredCode: true }, { status: 400 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress?.trim();
    if (!email) {
      return NextResponse.json({ error: "Primary email missing", clearStoredCode: false }, { status: 400 });
    }

    await authedFetchMutation(api.users.upsertUser, {
      clerk_id: userId,
      email,
    });

    await serverConvex.mutation(api.referrals.ensureReferralProfile, {
      clerk_id: userId,
      email,
    });

    const result = await serverConvex.mutation(api.referrals.claimReferralSecure, {
      access_key: stripeAccessKey,
      clerk_id: userId,
      email,
      referral_code: referralCode,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Referral claim failed";
    return NextResponse.json({ error: message, clearStoredCode: false }, { status: 500 });
  }
}
