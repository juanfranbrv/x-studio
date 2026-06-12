import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { authedFetchQuery } from "@/lib/convex-server";
import type { Id } from "@/../convex/_generated/dataModel";
import type {
  BrandLock,
  LayoutSpec,
  SanitizedNarrativeOut,
  StyleDNA,
} from "@/lib/pipeline/types";
import { buildStyleToBrandAdapter } from "@/lib/pipeline/adapter";
import { compilePrompt } from "@/lib/pipeline/compilePrompt";
import { ALL_FORBIDDEN_TOKENS } from "@/lib/pipeline/forbiddenTokens";
import { generateImageFromPromptRaw } from "@/lib/gemini";
import { log } from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type SlideInput = {
  slide: number;
  guidance: string;
  context?: string;
  emotion?: string[];
  text: {
    headline: string;
    body: string;
    cta?: string;
    url?: string;
  };
};

function validateLayoutSpec(layout: LayoutSpec) {
  const forbidden = new Set(
    [...ALL_FORBIDDEN_TOKENS, "glass", "neon", "metallic", "chrome", "cinematic", "photorealistic", "realistic"].map(
      (t) => t.toLowerCase()
    )
  );

  for (const rule of layout.rules) {
    const lower = rule.toLowerCase();
    for (const token of forbidden) {
      if (lower.includes(token)) {
        throw new Error(`Layout rule contiene estilo/material prohibido: "${token}"`);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      brandId,
      brandLock,
      layoutSpec,
      referenceImageUrl,
      slides,
      textModel,
      imageModel,
      aspectRatio,
    } = body as {
      brandId?: string;
      brandLock: BrandLock;
      layoutSpec: LayoutSpec;
      referenceImageUrl: string;
      slides: SlideInput[];
      textModel?: string;
      imageModel?: string;
      aspectRatio?: string;
    };

    if (!brandLock || !layoutSpec || !referenceImageUrl || !slides?.length) {
      return NextResponse.json(
        { error: "Faltan brandLock, layoutSpec, referenceImageUrl o slides" },
        { status: 400 }
      );
    }

    if (!textModel || !imageModel) {
      return NextResponse.json(
        { error: "Debes proporcionar textModel e imageModel desde el panel de Admin." },
        { status: 400 }
      );
    }

    validateLayoutSpec(layoutSpec);

    const normalizedBrandId = brandId as Id<"brand_dna"> | undefined;
    const auditFlowId = `flow_carousel_pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let userEmail: string | undefined;
    const logEconomicEvent = async (params: {
      phase: string;
      model: string;
      kind: "intelligence" | "image";
      metadata?: Record<string, unknown>;
    }) => {
      try {
        await convex.mutation(api.economic.logEconomicEvent, {
          flow_id: auditFlowId,
          phase: params.phase,
          model: params.model,
          kind: params.kind,
          user_clerk_id: userId,
          user_email: userEmail,
          metadata: params.metadata,
        });
      } catch (error) {
        log.warn("ECONOMIC", `Audit event failed | phase=${params.phase} model=${params.model}`, error);
      }
    };
    try {
      const userRow = await authedFetchQuery(api.users.getUser, { clerk_id: userId });
      userEmail = userRow?.email || undefined;
    } catch (error) {
      log.warn("ECONOMIC", "No se pudo resolver email de usuario para auditoria de carrusel pipeline", error);
    }

    const carouselId = await convex.mutation(api.pipeline.createCarousel, {
      brandId: normalizedBrandId,
      brandLock,
      layoutSpec,
    });

    const styleDNA = (await convex.action(api.pipeline.analyzeReferenceImage, {
      carouselId,
      imageUrl: referenceImageUrl,
      model: textModel,
    })) as StyleDNA;
    await logEconomicEvent({
      phase: "carousel_pipeline_analyze_reference_image",
      model: textModel,
      kind: "intelligence",
      metadata: { carousel_id: String(carouselId) },
    });

    const adapter = buildStyleToBrandAdapter(styleDNA, brandLock);

    await convex.mutation(api.pipeline.saveAdapter, {
      carouselId,
      adapter,
    });

    const results: Array<{ slide: number; prompt: string; imageUrl?: string }> = [];

    for (const slideInput of slides) {
      const narrative = (await convex.action(api.pipeline.generateNarrativeSlide, {
        carouselId,
        slide: slideInput.slide,
        guidance: slideInput.guidance,
        context: slideInput.context,
        emotion: slideInput.emotion,
        model: textModel,
      })) as SanitizedNarrativeOut;
      await logEconomicEvent({
        phase: "carousel_pipeline_generate_narrative_slide",
        model: textModel,
        kind: "intelligence",
        metadata: {
          carousel_id: String(carouselId),
          slide: slideInput.slide,
        },
      });

      const compiled = compilePrompt({
        brand: brandLock,
        style: styleDNA,
        adapter,
        layout: layoutSpec,
        narrative,
        text: slideInput.text,
      });

      await convex.mutation(api.pipeline.saveCompiledPrompt, {
        carouselId,
        slide: slideInput.slide,
        compiledPrompt: compiled,
      });

      const imageUrl = await generateImageFromPromptRaw(
        compiled.prompt,
        imageModel,
        aspectRatio
      );
      await logEconomicEvent({
        phase: "carousel_pipeline_generate_slide_image",
        model: imageModel,
        kind: "image",
        metadata: {
          carousel_id: String(carouselId),
          slide: slideInput.slide,
        },
      });

      results.push({
        slide: slideInput.slide,
        prompt: compiled.prompt,
        imageUrl,
      });
    }

    return NextResponse.json({
      success: true,
      carouselId,
      styleDNA,
      results,
    });
  } catch (error: unknown) {
    log.error("API", "Carousel generation error", error);
    const message = error instanceof Error ? error.message : "Error generando el carrusel";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
