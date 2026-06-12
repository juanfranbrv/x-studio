import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserPayload = {
  id?: string;
  primary_email_address_id?: string;
  email_addresses?: ClerkEmailAddress[];
};

function buildWebhookSecretCandidates(secret: string | undefined): string[] {
  if (!secret) return [];

  const trimmed = secret.trim();
  const unquoted = trimmed.replace(/^['"]+|['"]+$/g, "");
  const compact = unquoted.replace(/\s+/g, "");
  const raw = compact.startsWith("whsec_") ? compact.slice("whsec_".length) : compact;

  const asBase64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = asBase64 + "=".repeat((4 - (asBase64.length % 4)) % 4);

  const candidates = new Set<string>();
  for (const value of [compact, raw, asBase64, paddedBase64]) {
    if (!value) continue;
    candidates.add(value);
    candidates.add(`whsec_${value}`);
  }

  return Array.from(candidates);
}

function getPrimaryEmail(data: ClerkUserPayload): string | null {
  const primaryEmailId = data?.primary_email_address_id;
  const addresses = Array.isArray(data?.email_addresses) ? data.email_addresses : [];
  const primary = addresses.find((item) => item?.id === primaryEmailId) || addresses[0];
  const email = primary?.email_address;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

async function getPrimaryEmailFromClerk(clerkId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkId);
    const primaryId = user.primaryEmailAddressId;
    const primary =
      user.emailAddresses.find((item) => item.id === primaryId) ?? user.emailAddresses[0];
    const email = primary?.emailAddress;
    return typeof email === "string" && email.trim() ? email.trim() : null;
  } catch (error) {
    log.warn("API", "[CLERK_WEBHOOK] Fallback email lookup en Clerk fallido", {
      clerkId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const envSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    let event;
    const candidateSecrets = buildWebhookSecretCandidates(envSecret);

    let lastError: unknown = null;
    for (const secret of candidateSecrets) {
      try {
        event = await verifyWebhook(req.clone(), { signingSecret: secret });
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!event) {
      if (!envSecret) {
        event = await verifyWebhook(req.clone());
      } else if (lastError) {
        throw lastError;
      } else {
        throw new Error("Webhook verification failed");
      }
    }

    const eventType = event.type;
    const data = event.data as ClerkUserPayload;
    const clerkId = data?.id as string | undefined;

    if (!clerkId) {
      log.warn("API", "[CLERK_WEBHOOK] Evento sin clerkId, ignorado", { eventType });
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    if (eventType === "user.deleted") {
      await fetchMutation(api.users.deleteUserByClerkId, {
        clerk_id: clerkId,
        access_key: process.env.INTERNAL_ACCESS_KEY || process.env.STRIPE_INTERNAL_SECRET || "",
      });
      log.success("API", "[CLERK_WEBHOOK] Usuario eliminado sincronizado", { clerkId });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (eventType === "user.created" || eventType === "user.updated") {
      const email = getPrimaryEmail(data) ?? (await getPrimaryEmailFromClerk(clerkId));
      if (!email) {
        log.warn("API", "[CLERK_WEBHOOK] Usuario sin email primario, ignorado", { clerkId, eventType });
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }

      const sync = await fetchMutation(api.users.syncUserFromClerkWebhook, {
        clerk_id: clerkId,
        email,
        access_key: process.env.INTERNAL_ACCESS_KEY || process.env.STRIPE_INTERNAL_SECRET || "",
      });

      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          role: sync.role,
          status: sync.status,
        },
      });

      log.success("API", "[CLERK_WEBHOOK] Usuario sincronizado", {
        clerkId,
        eventType,
        action: sync.action,
        role: sync.role,
        status: sync.status,
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    log.debug("API", "[CLERK_WEBHOOK] Evento no manejado", { eventType });
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  } catch (error) {
    log.error("API", "[CLERK_WEBHOOK] Error procesando webhook", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "unknown_webhook_error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
