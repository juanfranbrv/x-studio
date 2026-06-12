import { NextRequest, NextResponse } from "next/server";

import {
  sendTransactionalEmail,
  type TransactionalEmailTemplate,
} from "@/lib/email/smtp2go";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

const ALLOWED_TEMPLATES: TransactionalEmailTemplate[] = [
  "welcome",
  "betaApproved",
  "creditsPurchased",
];

type TransactionalEmailRequest = {
  to?: string;
  template?: TransactionalEmailTemplate;
  locale?: "es" | "en";
  name?: string;
  actionUrl?: string;
  credits?: number;
  packName?: string;
};

export async function POST(request: NextRequest) {
  // Ruta exclusiva de desarrollo: en produccion queda cerrada incondicionalmente.
  // (El header Host lo controla el cliente, asi que no sirve como barrera.)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as TransactionalEmailRequest;
    const to = String(
      body.to || process.env.SMTP2GO_TEST_RECIPIENT || process.env.SMTP2GO_REPLY_TO || "",
    ).trim();
    const template = body.template || "welcome";

    if (!to) {
      return NextResponse.json({ error: "Recipient missing" }, { status: 400 });
    }

    if (!ALLOWED_TEMPLATES.includes(template)) {
      return NextResponse.json({ error: "Unsupported template" }, { status: 400 });
    }

    const result = await sendTransactionalEmail({
      to,
      template,
      locale: body.locale || "es",
      props: {
        name: body.name || "Juanfran",
        actionUrl: body.actionUrl,
        credits: body.credits,
        packName: body.packName,
      },
    });

    return NextResponse.json({
      ok: true,
      to,
      template,
      result,
    });
  } catch (error) {
    log.error("API", "[SMTP2GO] Error en ruta local de prueba", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown transactional email error",
      },
      { status: 500 },
    );
  }
}
