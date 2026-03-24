import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const MODULES = new Set(["image", "carousel", "brand-kit"]);
const MAX_SESSION_GENERATIONS = 24;
const MAX_SELECTED_CONTEXT = 16;
const MAX_CAROUSEL_SLIDES = 12;
const MAX_CAROUSEL_HISTORY = 2;
const MAX_UPLOADED_IMAGES = 8;
const MAX_SELECTED_COLORS = 10;
const MAX_BRANDKIT_IMAGE_IDS = 10;
const MAX_REFERENCE_IMAGE_ROLES = 16;
const MAX_SESSIONS_PER_SCOPE = 40;
const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];

function ensureModule(module: string): "image" | "carousel" | "brand-kit" {
  const normalized = module.trim().toLowerCase();
  if (!MODULES.has(normalized)) throw new Error("Unsupported module");
  return normalized as "image" | "carousel" | "brand-kit";
}

function normalizePrompt(prompt?: string) {
  const clean = (prompt || "").trim();
  return clean.length > 0 ? clean : undefined;
}

function isAdmin(email: string) {
  return ADMIN_EMAILS.includes((email || "").toLowerCase().trim());
}

function limitText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function takeLast<T>(value: T[], max: number): T[] {
  if (!Array.isArray(value)) return [];
  if (value.length <= max) return value;
  return value.slice(value.length - max);
}

function recursivelyStripLargeStrings(value: unknown, fieldName?: string): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return null;
    // Preserve URLs exactly; truncating them breaks image recovery in session history.
    if (value.startsWith("http://") || value.startsWith("https://")) return value;

    const promptLikeField = new Set([
      "prompt",
      "prompt_used",
      "promptValue",
      "editPrompt",
      "rawMessage",
      "additionalInstructions",
      "headline",
      "cta",
      "caption",
      "rootPrompt",
    ]);

    if (promptLikeField.has(fieldName || "") && value.length > 6000) {
      return `${value.slice(0, 6000)}…`;
    }

    if (value.length > 20000) return `${value.slice(0, 20000)}…`;
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => recursivelyStripLargeStrings(item, fieldName));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      next[k] = recursivelyStripLargeStrings(v, k);
    }
    return next;
  }
  return value;
}

function compactSessionGenerations(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const snapshot = { ...(value as Record<string, unknown>) };
  const raw = snapshot.sessionGenerations;
  if (!Array.isArray(raw)) return snapshot;

  snapshot.sessionGenerations = takeLast(raw, MAX_SESSION_GENERATIONS).map((item) => {
    if (!item || typeof item !== "object") return item;
    const row = item as Record<string, unknown>;
    return {
      id: row.id,
      image_url: row.image_url,
      image_storage_id: row.image_storage_id,
      preview_image_url: row.preview_image_url,
      preview_image_storage_id: row.preview_image_storage_id,
      original_image_url: row.original_image_url,
      original_image_storage_id: row.original_image_storage_id,
      created_at: row.created_at,
      prompt_used: limitText(row.prompt_used, 900),
      error_title: row.error_title,
      error_fallback: row.error_fallback,
      request_payload: undefined,
    };
  });
  return snapshot;
}

function compactSelectedContext(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_SELECTED_CONTEXT)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        id: limitText(row.id, 120),
        type: limitText(row.type, 40),
        value: limitText(row.value, 500),
        label: limitText(row.label, 160),
      };
    })
    .filter(Boolean);
}

function compactReferenceImageRoles(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, role]) => Boolean(limitText(key, 240)) && typeof role === "string")
      .slice(0, MAX_REFERENCE_IMAGE_ROLES)
      .map(([key, role]) => [key, role]),
  );
}

function compactSelectedColors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_SELECTED_COLORS).map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      color: limitText(row.color, 32),
      role: limitText(row.role, 32),
    };
  }).filter(Boolean);
}

function compactCarouselSlideRow(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const row = item as Record<string, unknown>;
  return {
    index: typeof row.index === "number" ? row.index : null,
    title: limitText(row.title, 180),
    description: limitText(row.description, 700),
    status: limitText(row.status, 40),
    imageUrl: row.imageUrl,
    image_storage_id: row.image_storage_id,
    imagePreviewUrl: row.imagePreviewUrl,
    image_preview_storage_id: row.image_preview_storage_id,
    imageOriginalUrl: row.imageOriginalUrl,
    image_original_storage_id: row.image_original_storage_id,
    error: limitText(row.error, 240),
  };
}

function compactCarouselScriptSlideRow(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const row = item as Record<string, unknown>;
  return {
    index: typeof row.index === "number" ? row.index : null,
    title: limitText(row.title, 180),
    description: limitText(row.description, 700),
    visualPrompt: limitText(row.visualPrompt, 1200),
  };
}

function compactCarouselSuggestion(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const row = item as Record<string, unknown>;
  return {
    title: limitText(row.title, 120),
    subtitle: limitText(row.subtitle, 240),
    slides: Array.isArray(row.slides)
      ? takeLast(row.slides, MAX_CAROUSEL_SLIDES).map((slide) => compactCarouselScriptSlideRow(slide))
      : [],
    hook: limitText(row.hook, 220),
    structure: row.structure && typeof row.structure === "object"
      ? {
          id: limitText((row.structure as Record<string, unknown>).id, 120),
          name: limitText((row.structure as Record<string, unknown>).name, 180),
        }
      : undefined,
    optimalSlideCount: typeof row.optimalSlideCount === "number" ? row.optimalSlideCount : undefined,
    detectedIntent: limitText(row.detectedIntent, 80),
    caption: limitText(row.caption, 1200),
  };
}

function compactImageTypography(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  return {
    mode: limitText(row.mode, 32),
    familyClass: limitText(row.familyClass, 32),
    weight: limitText(row.weight, 32),
    width: limitText(row.width, 32),
    casing: limitText(row.casing, 32),
    spacing: limitText(row.spacing, 32),
    contrast: limitText(row.contrast, 32),
    tone: limitText(row.tone, 32),
  };
}

function compactImageTextAssets(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      id: limitText(row.id, 120),
      type: limitText(row.type, 32),
      label: limitText(row.label, 120),
      value: limitText(row.value, 500),
    };
  }).filter(Boolean);
}

function compactImageOriginalState(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  return {
    headline: limitText(row.headline, 300),
    cta: limitText(row.cta, 180),
    ctaUrl: limitText(row.ctaUrl, 300),
    ctaUrlEnabled: row.ctaUrlEnabled === true,
    caption: limitText(row.caption, 1200),
    typography: compactImageTypography(row.typography),
    customTexts: row.customTexts,
    selectedTextAssets: compactImageTextAssets(row.selectedTextAssets),
  };
}

function compactImageSuggestion(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const row = item as Record<string, unknown>;
  const modifications = row.modifications && typeof row.modifications === "object"
    ? row.modifications as Record<string, unknown>
    : {};

  return {
    title: limitText(row.title, 120),
    subtitle: limitText(row.subtitle, 240),
    modifications: {
      headline: limitText(modifications.headline, 300),
      cta: limitText(modifications.cta, 180),
      ctaUrl: limitText(modifications.ctaUrl, 300),
      ctaUrlEnabled: modifications.ctaUrlEnabled === true,
      caption: limitText(modifications.caption, 1200),
      customTexts: modifications.customTexts,
      selectedTextAssets: compactImageTextAssets(modifications.selectedTextAssets),
      imageTexts: Array.isArray(modifications.imageTexts)
        ? modifications.imageTexts.slice(0, 12).map((text) => {
            if (!text || typeof text !== "object") return null;
            const imageText = text as Record<string, unknown>;
            return {
              label: limitText(imageText.label, 120),
              value: limitText(imageText.value, 500),
              type: limitText(imageText.type, 32),
            };
          }).filter(Boolean)
        : [],
    },
  };
}

function compactImageCreationFlowState(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  return {
    selectedPlatform: row.selectedPlatform,
    selectedFormat: row.selectedFormat,
    selectedGroup: row.selectedGroup,
    selectedIntent: row.selectedIntent,
    selectedSubMode: row.selectedSubMode,
    uploadedImages: Array.isArray(row.uploadedImages) ? row.uploadedImages.slice(0, MAX_UPLOADED_IMAGES) : [],
    selectedTheme: row.selectedTheme,
    imageSourceMode: row.imageSourceMode,
    selectedBrandKitImageIds: Array.isArray(row.selectedBrandKitImageIds) ? row.selectedBrandKitImageIds.slice(0, MAX_BRANDKIT_IMAGE_IDS) : [],
    referenceImageRoles: compactReferenceImageRoles(row.referenceImageRoles),
    aiImageDescription: limitText(row.aiImageDescription, 1200),
    suggestions: Array.isArray(row.suggestions)
      ? row.suggestions.slice(0, 4).map((item) => compactImageSuggestion(item))
      : [],
    imagePromptSuggestions: Array.isArray(row.imagePromptSuggestions)
      ? row.imagePromptSuggestions.slice(0, 4).map((item) => limitText(item, 280)).filter(Boolean)
      : [],
    originalState: compactImageOriginalState(row.originalState),
    selectedStyles: Array.isArray(row.selectedStyles) ? row.selectedStyles.slice(0, 8) : [],
    selectedStylePresetId: row.selectedStylePresetId,
    selectedStylePresetName: limitText(row.selectedStylePresetName, 120),
    selectedLayout: row.selectedLayout,
    selectedLogoId: row.selectedLogoId,
    headline: limitText(row.headline, 300),
    cta: limitText(row.cta, 180),
    caption: limitText(row.caption, 1200),
    ctaUrl: limitText(row.ctaUrl, 300),
    ctaUrlEnabled: row.ctaUrlEnabled === true,
    customTexts: row.customTexts,
    selectedBrandColors: compactSelectedColors(row.selectedBrandColors),
    rawMessage: limitText(row.rawMessage, 1800),
    additionalInstructions: limitText(row.additionalInstructions, 1200),
    customStyle: limitText(row.customStyle, 1200),
    applyStyleToTypography: row.applyStyleToTypography === true,
    selectedTextAssets: compactImageTextAssets(row.selectedTextAssets),
    generatedImage: row.generatedImage,
    hasGeneratedImage: row.hasGeneratedImage === true,
  };
}

function compactImageSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const snapshot = value as Record<string, unknown>;
  const compactGenerations = compactSessionGenerations({ sessionGenerations: snapshot.sessionGenerations }) as Record<string, unknown>;
  return {
    version: snapshot.version,
    module: snapshot.module,
    promptValue: limitText(snapshot.promptValue, 1800) || "",
    editPrompt: limitText(snapshot.editPrompt, 1200) || "",
    logoInclusion: snapshot.logoInclusion === true,
    compositionMode: snapshot.compositionMode,
    selectedContext: compactSelectedContext(snapshot.selectedContext),
    sessionGenerations: compactGenerations.sessionGenerations,
    creationFlowState: compactImageCreationFlowState(snapshot.creationFlowState),
    rootPrompt: limitText(snapshot.rootPrompt, 1800),
  };
}

function compactCarouselSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const snapshot = value as Record<string, unknown>;
  const previewState = snapshot.previewState && typeof snapshot.previewState === "object"
    ? snapshot.previewState as Record<string, unknown>
    : {};

  return {
    version: snapshot.version,
    module: snapshot.module,
    prompt: limitText(snapshot.prompt, 1800) || "",
    slideCount: snapshot.slideCount,
    aspectRatio: snapshot.aspectRatio,
    style: snapshot.style,
    structureId: snapshot.structureId,
    compositionId: snapshot.compositionId,
    compositionMode: snapshot.compositionMode,
    basicSelectedCompositionId: snapshot.basicSelectedCompositionId,
    imageSourceMode: snapshot.imageSourceMode,
    aiImageDescription: limitText(snapshot.aiImageDescription, 1200) || "",
    aiStyleDirectives: limitText(snapshot.aiStyleDirectives, 1200) || "",
    customStyle: limitText(snapshot.customStyle, 1200) || "",
    applyStyleToTypography: snapshot.applyStyleToTypography === true,
    selectedStylePresetId: snapshot.selectedStylePresetId,
    selectedStylePresetName: limitText(snapshot.selectedStylePresetName, 120),
    selectedLogoId: snapshot.selectedLogoId,
    selectedColors: compactSelectedColors(snapshot.selectedColors),
    selectedBrandKitImageIds: Array.isArray(snapshot.selectedBrandKitImageIds)
      ? snapshot.selectedBrandKitImageIds.slice(0, MAX_BRANDKIT_IMAGE_IDS)
      : [],
    referenceImageRoles: compactReferenceImageRoles(snapshot.referenceImageRoles),
    uploadedImages: Array.isArray(snapshot.uploadedImages) ? snapshot.uploadedImages.slice(0, MAX_UPLOADED_IMAGES) : [],
    includeLogoOnSlides: snapshot.includeLogoOnSlides === true,
    suggestions: Array.isArray(snapshot.suggestions)
      ? snapshot.suggestions.slice(0, 4).map((item) => compactCarouselSuggestion(item))
      : [],
    imagePromptSuggestions: Array.isArray(snapshot.imagePromptSuggestions)
      ? snapshot.imagePromptSuggestions.slice(0, 4).map((item) => limitText(item, 280)).filter(Boolean)
      : [],
    slideVariantSelection: Array.isArray(snapshot.slideVariantSelection)
      ? snapshot.slideVariantSelection.slice(0, MAX_CAROUSEL_SLIDES).map((item) => limitText(item, 32)).filter(Boolean)
      : [],
    analysisHook: limitText(snapshot.analysisHook, 220),
    analysisStructure: snapshot.analysisStructure && typeof snapshot.analysisStructure === "object"
      ? {
          id: limitText((snapshot.analysisStructure as Record<string, unknown>).id, 120),
          name: limitText((snapshot.analysisStructure as Record<string, unknown>).name, 180),
        }
      : undefined,
    analysisIntent: limitText(snapshot.analysisIntent, 80),
    originalAnalysis: snapshot.originalAnalysis && typeof snapshot.originalAnalysis === "object"
      ? {
          slides: Array.isArray((snapshot.originalAnalysis as Record<string, unknown>).slides)
            ? takeLast((snapshot.originalAnalysis as Record<string, unknown>).slides as unknown[], MAX_CAROUSEL_SLIDES).map((slide) => compactCarouselSlideRow(slide))
            : [],
          scriptSlides: Array.isArray((snapshot.originalAnalysis as Record<string, unknown>).scriptSlides)
            ? takeLast((snapshot.originalAnalysis as Record<string, unknown>).scriptSlides as unknown[], MAX_CAROUSEL_SLIDES).map((slide) => compactCarouselScriptSlideRow(slide))
            : [],
          hook: limitText((snapshot.originalAnalysis as Record<string, unknown>).hook, 220),
          structure: (snapshot.originalAnalysis as Record<string, unknown>).structure && typeof (snapshot.originalAnalysis as Record<string, unknown>).structure === "object"
            ? {
                id: limitText((((snapshot.originalAnalysis as Record<string, unknown>).structure as Record<string, unknown>).id), 120),
                name: limitText((((snapshot.originalAnalysis as Record<string, unknown>).structure as Record<string, unknown>).name), 180),
              }
            : undefined,
          detectedIntent: limitText((snapshot.originalAnalysis as Record<string, unknown>).detectedIntent, 80),
          caption: limitText((snapshot.originalAnalysis as Record<string, unknown>).caption, 1200),
        }
      : undefined,
    previewState: {
      slides: Array.isArray(previewState.slides)
        ? takeLast(previewState.slides, MAX_CAROUSEL_SLIDES).map((slide) => compactCarouselSlideRow(slide))
        : [],
      scriptSlides: Array.isArray(previewState.scriptSlides)
        ? takeLast(previewState.scriptSlides, MAX_CAROUSEL_SLIDES).map((slide) => compactCarouselScriptSlideRow(slide))
        : undefined,
      caption: limitText(previewState.caption, 1200),
      currentIndex: previewState.currentIndex,
      sessionHistory: Array.isArray(previewState.sessionHistory)
        ? takeLast(previewState.sessionHistory, MAX_CAROUSEL_HISTORY).map((entry) => {
            if (!entry || typeof entry !== "object") return entry;
            const row = entry as Record<string, unknown>;
            return {
              id: row.id,
              createdAt: row.createdAt,
              caption: limitText(row.caption, 1200),
              slides: Array.isArray(row.slides)
                ? takeLast(row.slides, MAX_CAROUSEL_SLIDES).map((slide) => compactCarouselSlideRow(slide))
                : [],
            };
          })
        : [],
    },
  };
}

function sanitizeSnapshot(snapshot: unknown): unknown {
  if (!snapshot) return snapshot;
  let next = recursivelyStripLargeStrings(snapshot);
  const moduleKey = next && typeof next === "object" && typeof (next as Record<string, unknown>).module === "string"
    ? (next as Record<string, unknown>).module
    : "";
  if (moduleKey === "image") {
    next = compactImageSnapshot(next);
  } else if (moduleKey === "carousel") {
    next = compactCarouselSnapshot(next);
  }
  let size = JSON.stringify(next).length;

  if (size > 900_000) {
    next = compactSessionGenerations(next);
    size = JSON.stringify(next).length;
  }

  if (size > 900_000 && next && typeof next === "object") {
    const trimmed = { ...(next as Record<string, unknown>) };
    delete trimmed.selectedContext;
    next = trimmed;
    size = JSON.stringify(next).length;
  }

  if (size > 900_000 && next && typeof next === "object") {
    const trimmed = { ...(next as Record<string, unknown>) };
    delete trimmed.editPrompt;
    delete trimmed.promptValue;
    next = trimmed;
  }

  return next;
}

function safeStableStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "";
  }
}

function normalizeSessionText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function summarizeContext(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        type: normalizeSessionText(row.type),
        value: normalizeSessionText(row.value),
        label: normalizeSessionText(row.label),
      };
    })
    .filter(Boolean);
}

function summarizeImageGenerations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      image: normalizeSessionText(row.image_storage_id) || normalizeSessionText(row.image_url),
      preview: normalizeSessionText(row.preview_image_storage_id) || normalizeSessionText(row.preview_image_url),
      original: normalizeSessionText(row.original_image_storage_id) || normalizeSessionText(row.original_image_url),
      prompt: normalizeSessionText(row.prompt_used),
      error: normalizeSessionText(row.error_title),
    };
  }).filter(Boolean);
}

function summarizeCarouselSlides(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      index: typeof row.index === "number" ? row.index : null,
      title: normalizeSessionText(row.title),
      description: normalizeSessionText(row.description),
      status: normalizeSessionText(row.status),
      image: normalizeSessionText(row.image_storage_id) || normalizeSessionText(row.imageUrl),
      preview: normalizeSessionText(row.image_preview_storage_id) || normalizeSessionText(row.imagePreviewUrl),
      original: normalizeSessionText(row.image_original_storage_id) || normalizeSessionText(row.imageOriginalUrl),
      error: normalizeSessionText(row.error),
    };
  }).filter(Boolean);
}

function summarizeCarouselScriptSlides(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      index: typeof row.index === "number" ? row.index : null,
      title: normalizeSessionText(row.title),
      description: normalizeSessionText(row.description),
      visualPrompt: normalizeSessionText(row.visualPrompt),
    };
  }).filter(Boolean);
}

function summarizeSessionHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    return {
      caption: normalizeSessionText(row.caption),
      slides: summarizeCarouselSlides(row.slides),
    };
  }).filter(Boolean);
}

function buildSessionFingerprint(session: {
  module: string;
  title?: string;
  root_prompt?: string;
  snapshot?: unknown;
}) {
  const snapshot = session.snapshot && typeof session.snapshot === "object"
    ? session.snapshot as Record<string, unknown>
    : {};

  if (session.module === "image") {
    return safeStableStringify({
      module: "image",
      title: normalizeSessionText(session.title),
      rootPrompt: normalizeSessionText(session.root_prompt) || normalizeSessionText(snapshot.rootPrompt) || normalizeSessionText(snapshot.promptValue),
      promptValue: normalizeSessionText(snapshot.promptValue),
      editPrompt: normalizeSessionText(snapshot.editPrompt),
      logoInclusion: snapshot.logoInclusion === true,
      compositionMode: normalizeSessionText(snapshot.compositionMode),
      selectedContext: summarizeContext(snapshot.selectedContext),
      sessionGenerations: summarizeImageGenerations(snapshot.sessionGenerations),
    });
  }

  const previewState = snapshot.previewState && typeof snapshot.previewState === "object"
    ? snapshot.previewState as Record<string, unknown>
    : {};

  return safeStableStringify({
    module: "carousel",
    title: normalizeSessionText(session.title),
    rootPrompt: normalizeSessionText(session.root_prompt) || normalizeSessionText(snapshot.prompt),
    prompt: normalizeSessionText(snapshot.prompt),
    slideCount: typeof snapshot.slideCount === "number" ? snapshot.slideCount : null,
    aspectRatio: normalizeSessionText(snapshot.aspectRatio),
    style: normalizeSessionText(snapshot.style),
    structureId: normalizeSessionText(snapshot.structureId),
    compositionId: normalizeSessionText(snapshot.compositionId),
    compositionMode: normalizeSessionText(snapshot.compositionMode),
    basicSelectedCompositionId: normalizeSessionText(snapshot.basicSelectedCompositionId),
    imageSourceMode: normalizeSessionText(snapshot.imageSourceMode),
    aiImageDescription: normalizeSessionText(snapshot.aiImageDescription),
    aiStyleDirectives: normalizeSessionText(snapshot.aiStyleDirectives),
    customStyle: normalizeSessionText(snapshot.customStyle),
    selectedStylePresetId: normalizeSessionText(snapshot.selectedStylePresetId),
    selectedStylePresetName: normalizeSessionText(snapshot.selectedStylePresetName),
    selectedLogoId: normalizeSessionText(snapshot.selectedLogoId),
    selectedColors: Array.isArray(snapshot.selectedColors) ? snapshot.selectedColors : [],
    selectedBrandKitImageIds: Array.isArray(snapshot.selectedBrandKitImageIds) ? snapshot.selectedBrandKitImageIds : [],
    referenceImageRoles: snapshot.referenceImageRoles && typeof snapshot.referenceImageRoles === "object" ? snapshot.referenceImageRoles : {},
    uploadedImages: Array.isArray(snapshot.uploadedImages) ? snapshot.uploadedImages : [],
    includeLogoOnSlides: snapshot.includeLogoOnSlides === true,
    slides: summarizeCarouselSlides(previewState.slides),
    scriptSlides: summarizeCarouselScriptSlides(previewState.scriptSlides),
    caption: normalizeSessionText(previewState.caption),
    sessionHistory: summarizeSessionHistory(previewState.sessionHistory),
  });
}

function compareSessionsForKeep<
  T extends { updated_at: string; created_at: string; active: boolean }
>(a: T, b: T) {
  const updatedDiff = b.updated_at.localeCompare(a.updated_at);
  if (updatedDiff !== 0) return updatedDiff;
  if (a.active !== b.active) return a.active ? -1 : 1;
  return b.created_at.localeCompare(a.created_at);
}

async function getLatestForScope(
  ctx: MutationCtx | QueryCtx,
  args: { user_id: string; module: "image" | "carousel" | "brand-kit"; brand_id?: Id<"brand_dna">; activeOnly?: boolean },
) {
  const activeOnly = args.activeOnly === true;

  if (args.brand_id) {
    const byBrand = activeOnly
      ? await ctx.db
          .query("work_sessions")
          .withIndex("by_user_brand_module_active_updated", (q) =>
            q.eq("user_id", args.user_id).eq("brand_id", args.brand_id).eq("module", args.module).eq("active", true),
          )
          .order("desc")
          .take(1)
      : await ctx.db
          .query("work_sessions")
          .withIndex("by_user_brand_module_updated", (q) =>
            q.eq("user_id", args.user_id).eq("brand_id", args.brand_id).eq("module", args.module),
          )
          .order("desc")
          .take(1);

    if (byBrand[0]) return byBrand[0];

    // Legacy fallback: older sessions could exist without brand_id.
    const legacyRows = await ctx.db
      .query("work_sessions")
      .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", args.module))
      .order("desc")
      .take(200);
    return legacyRows.find((row) => row.brand_id === undefined && (!activeOnly || row.active)) || null;
  }

  const byUserModule = activeOnly
    ? await ctx.db
        .query("work_sessions")
        .withIndex("by_user_module_active_updated", (q) =>
          q.eq("user_id", args.user_id).eq("module", args.module).eq("active", true),
        )
        .order("desc")
        .take(1)
    : await ctx.db
        .query("work_sessions")
        .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", args.module))
        .order("desc")
        .take(1);

  return byUserModule[0] || null;
}

async function listLatestForScope(
  ctx: MutationCtx | QueryCtx,
  args: { user_id: string; module: "image" | "carousel" | "brand-kit"; brand_id?: Id<"brand_dna">; limit: number },
) {
  if (args.brand_id) {
    const byBrand = await ctx.db
      .query("work_sessions")
      .withIndex("by_user_brand_module_updated", (q) =>
        q.eq("user_id", args.user_id).eq("brand_id", args.brand_id).eq("module", args.module),
      )
      .order("desc")
      .take(args.limit);

    if (byBrand.length > 0) return byBrand;

    // Legacy fallback.
    const legacy = await ctx.db
      .query("work_sessions")
      .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", args.module))
      .order("desc")
      .take(Math.max(args.limit, 200));
    return legacy.filter((row) => row.brand_id === undefined).slice(0, args.limit);
  }

  return await ctx.db
    .query("work_sessions")
    .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", args.module))
    .order("desc")
    .take(args.limit);
}

async function listActiveForScope(
  ctx: MutationCtx | QueryCtx,
  args: { user_id: string; module: "image" | "carousel" | "brand-kit"; brand_id?: Id<"brand_dna">; limit?: number },
) {
  const takeLimit = Math.max(1, Math.min(args.limit ?? 40, 200));
  if (args.brand_id) {
    return await ctx.db
      .query("work_sessions")
      .withIndex("by_user_brand_module_active_updated", (q) =>
        q.eq("user_id", args.user_id).eq("brand_id", args.brand_id).eq("module", args.module).eq("active", true),
      )
      .order("desc")
      .take(takeLimit);
  }

  return await ctx.db
    .query("work_sessions")
    .withIndex("by_user_module_active_updated", (q) =>
      q.eq("user_id", args.user_id).eq("module", args.module).eq("active", true),
    )
    .order("desc")
    .take(takeLimit);
}

async function pruneInactiveSessionsForScope(
  ctx: MutationCtx,
  args: { user_id: string; module: "image" | "carousel" | "brand-kit"; brand_id?: Id<"brand_dna"> },
) {
  const rows = args.brand_id
    ? await ctx.db
        .query("work_sessions")
        .withIndex("by_user_brand_module_updated", (q) =>
          q.eq("user_id", args.user_id).eq("brand_id", args.brand_id).eq("module", args.module),
        )
        .order("desc")
        .take(200)
    : (await ctx.db
        .query("work_sessions")
        .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", args.module))
        .order("desc")
        .take(200)).filter((row) => row.brand_id === undefined);

  if (rows.length <= MAX_SESSIONS_PER_SCOPE) return;

  const overflow = rows.slice(MAX_SESSIONS_PER_SCOPE);
  const deletable = overflow.filter((row) => !row.active && row.title_customized !== true);

  for (const row of deletable) {
    await ctx.db.delete(row._id);
  }
}

async function resolveSnapshotImageUrls(
  ctx: { storage: { getUrl: (storageId: string) => Promise<string | null> } },
  snapshot: unknown,
): Promise<unknown> {
  if (!snapshot || typeof snapshot !== "object") return snapshot;
  const next = { ...(snapshot as Record<string, unknown>) };
  const generationRows = Array.isArray(next.sessionGenerations) ? next.sessionGenerations : [];
  if (generationRows.length) {
    const resolvedGenerations = await Promise.all(
      generationRows.map(async (row) => {
        if (!row || typeof row !== "object") return row;
        const item = { ...(row as Record<string, unknown>) };
        const storageId = typeof item.image_storage_id === "string" ? item.image_storage_id.trim() : "";
        const previewStorageId = typeof item.preview_image_storage_id === "string" ? item.preview_image_storage_id.trim() : "";
        const originalStorageId = typeof item.original_image_storage_id === "string" ? item.original_image_storage_id.trim() : storageId;

        if (previewStorageId) {
          const previewUrl = await ctx.storage.getUrl(previewStorageId);
          if (previewUrl) {
            item.preview_image_url = previewUrl;
            item.image_url = previewUrl;
          }
        }

        if (originalStorageId) {
          const originalUrl = await ctx.storage.getUrl(originalStorageId);
          if (originalUrl) {
            item.original_image_url = originalUrl;
            item.original_image_storage_id = originalStorageId;
            if (!item.image_url) item.image_url = originalUrl;
          }
        } else if (storageId) {
          const url = await ctx.storage.getUrl(storageId);
          if (url) item.image_url = url;
        }
        return item;
      }),
    );
    next.sessionGenerations = resolvedGenerations;
  }

  const previewState = next.previewState;
  if (previewState && typeof previewState === "object") {
    const previewNext = { ...(previewState as Record<string, unknown>) };
    const previewSlides = Array.isArray(previewNext.slides) ? previewNext.slides : [];
    if (previewSlides.length) {
      const resolvedSlides = await Promise.all(
        previewSlides.map(async (row) => {
          if (!row || typeof row !== "object") return row;
          const item = { ...(row as Record<string, unknown>) };
          const storageId = typeof item.image_storage_id === "string" ? item.image_storage_id.trim() : "";
          const previewStorageId = typeof item.image_preview_storage_id === "string" ? item.image_preview_storage_id.trim() : "";
          const originalStorageId = typeof item.image_original_storage_id === "string" ? item.image_original_storage_id.trim() : storageId;

          if (previewStorageId) {
            const previewUrl = await ctx.storage.getUrl(previewStorageId);
            if (previewUrl) {
              item.imagePreviewUrl = previewUrl;
              item.imageUrl = previewUrl;
            }
          }
          if (originalStorageId) {
            const originalUrl = await ctx.storage.getUrl(originalStorageId);
            if (originalUrl) {
              item.imageOriginalUrl = originalUrl;
              item.image_original_storage_id = originalStorageId;
              if (!item.imageUrl) item.imageUrl = originalUrl;
            }
          } else if (storageId) {
            const url = await ctx.storage.getUrl(storageId);
            if (url) item.imageUrl = url;
          }
          return item;
        }),
      );
      previewNext.slides = resolvedSlides;
      next.previewState = previewNext;
    }

    const previewHistory = Array.isArray(previewNext.sessionHistory) ? previewNext.sessionHistory : [];
    if (previewHistory.length) {
      const resolvedHistory = await Promise.all(
        previewHistory.map(async (entry) => {
          if (!entry || typeof entry !== "object") return entry;
          const historyItem = { ...(entry as Record<string, unknown>) };
          const historySlides = Array.isArray(historyItem.slides) ? historyItem.slides : [];
          if (!historySlides.length) return historyItem;

          const resolvedSlides = await Promise.all(
            historySlides.map(async (row) => {
              if (!row || typeof row !== "object") return row;
              const item = { ...(row as Record<string, unknown>) };
              const storageId = typeof item.image_storage_id === "string" ? item.image_storage_id.trim() : "";
              const previewStorageId = typeof item.image_preview_storage_id === "string" ? item.image_preview_storage_id.trim() : "";
              const originalStorageId = typeof item.image_original_storage_id === "string" ? item.image_original_storage_id.trim() : storageId;

              if (previewStorageId) {
                const previewUrl = await ctx.storage.getUrl(previewStorageId);
                if (previewUrl) {
                  item.imagePreviewUrl = previewUrl;
                  item.imageUrl = previewUrl;
                }
              }
              if (originalStorageId) {
                const originalUrl = await ctx.storage.getUrl(originalStorageId);
                if (originalUrl) {
                  item.imageOriginalUrl = originalUrl;
                  item.image_original_storage_id = originalStorageId;
                  if (!item.imageUrl) item.imageUrl = originalUrl;
                }
              } else if (storageId) {
                const url = await ctx.storage.getUrl(storageId);
                if (url) item.imageUrl = url;
              }
              return item;
            }),
          );

          historyItem.slides = resolvedSlides;
          return historyItem;
        }),
      );

      previewNext.sessionHistory = resolvedHistory;
      next.previewState = previewNext;
    }
  }

  return next;
}

export const getActiveSession = query({
  args: {
    user_id: v.string(),
    module: v.string(),
    brand_id: v.optional(v.id("brand_dna")),
  },
  handler: async (ctx, args) => {
    const moduleKey = ensureModule(args.module);
    const active = await getLatestForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      activeOnly: true,
    });
    const fallbackLatest = active
      ? null
      : await getLatestForScope(ctx, {
          user_id: args.user_id,
          module: moduleKey,
          brand_id: args.brand_id,
          activeOnly: false,
        });
    const selected = active || fallbackLatest;

    if (!selected) return null;
    const snapshot = await resolveSnapshotImageUrls(ctx, selected.snapshot);
    return {
      ...selected,
      snapshot,
    };
  },
});

export const listSessions = query({
  args: {
    user_id: v.string(),
    module: v.string(),
    brand_id: v.optional(v.id("brand_dna")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const moduleKey = ensureModule(args.module);
    const limit = Math.max(1, Math.min(args.limit ?? 30, 200));
    const rows = await listLatestForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      limit,
    });

    return Promise.all(
      rows.map(async (row) => {
        const snapshot = row.snapshot as Record<string, unknown> | undefined;
        let preview_image_url: string | undefined;

        if (snapshot?.module === "image") {
          // 1) Try creationFlowState.generatedImage (most recent sessions)
          const cfs = snapshot.creationFlowState as Record<string, unknown> | undefined;
          const img = cfs?.generatedImage;
          if (typeof img === "string" && img) {
            preview_image_url = img.startsWith("http")
              ? img
              : (await ctx.storage.getUrl(img as Id<"_storage">).catch(() => null)) ?? undefined;
          }
          // 2) Fallback: last entry in sessionGenerations (older sessions)
          if (!preview_image_url) {
            const gens = Array.isArray(snapshot.sessionGenerations)
              ? (snapshot.sessionGenerations as Array<Record<string, unknown>>)
              : [];
            const last = gens[gens.length - 1];
            if (last) {
              const directUrl = (last.preview_image_url ?? last.image_url) as string | undefined;
              if (directUrl?.startsWith("http")) {
                preview_image_url = directUrl;
              } else {
                const sid = (last.preview_image_storage_id ?? last.image_storage_id) as string | undefined;
                if (sid) {
                  preview_image_url = (await ctx.storage.getUrl(sid as Id<"_storage">).catch(() => null)) ?? undefined;
                }
              }
            }
          }
        } else if (snapshot?.module === "carousel") {
          // Helper: resolve a slide's image URL
          const resolveSlide = async (s: Record<string, unknown>): Promise<string | undefined> => {
            const directUrl = (s.imagePreviewUrl ?? s.imageUrl) as string | undefined;
            if (directUrl?.startsWith("http")) return directUrl;
            const sid = (s.image_preview_storage_id ?? s.image_storage_id) as string | undefined;
            if (sid) return (await ctx.storage.getUrl(sid as Id<"_storage">).catch(() => null)) ?? undefined;
            return undefined;
          };

          // 1) Try previewState.slides (current slides)
          const ps = snapshot.previewState as Record<string, unknown> | undefined;
          const slides = Array.isArray(ps?.slides) ? (ps!.slides as Array<Record<string, unknown>>) : [];
          for (const slide of slides) {
            const url = await resolveSlide(slide);
            if (url) { preview_image_url = url; break; }
          }
          // 2) Fallback: sessionHistory entries (older generations in the same session)
          if (!preview_image_url) {
            const history = Array.isArray(ps?.sessionHistory)
              ? (ps!.sessionHistory as Array<Record<string, unknown>>)
              : [];
            for (const entry of [...history].reverse()) {
              const entrySlides = Array.isArray(entry.slides) ? (entry.slides as Array<Record<string, unknown>>) : [];
              for (const slide of entrySlides) {
                const url = await resolveSlide(slide);
                if (url) { preview_image_url = url; break; }
              }
              if (preview_image_url) break;
            }
          }
        }

        return {
          _id: row._id,
          module: row.module,
          brand_id: row.brand_id,
          title: row.title || "",
          title_customized: row.title_customized === true,
          root_prompt: row.root_prompt || "",
          active: row.active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          preview_image_url,
        };
      })
    );
  },
});

export const getLastVisitedModule = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const [imageRows, carouselRows, brandKitRows] = await Promise.all([
      ctx.db
        .query("work_sessions")
        .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", "image"))
        .order("desc")
        .take(1),
      ctx.db
        .query("work_sessions")
        .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", "carousel"))
        .order("desc")
        .take(1),
      ctx.db
        .query("work_sessions")
        .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", "brand-kit"))
        .order("desc")
        .take(1),
    ]);

    const latest = [...imageRows, ...carouselRows, ...brandKitRows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    if (!latest) return null;

    return {
      module: latest.module,
      session_id: latest._id,
      brand_id: latest.brand_id,
      updated_at: latest.updated_at,
    };
  },
});

export const createSession = mutation({
  args: {
    user_id: v.string(),
    module: v.string(),
    brand_id: v.optional(v.id("brand_dna")),
    title: v.optional(v.string()),
    title_customized: v.optional(v.boolean()),
    root_prompt: v.optional(v.string()),
    snapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const moduleKey = ensureModule(args.module);
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const dedupeWindowMs = 8_000;
    const normalizedTitle = args.title?.trim() || undefined;
    const normalizedTitleCustomized = args.title_customized === true && Boolean(normalizedTitle);
    const normalizedRootPrompt = normalizePrompt(args.root_prompt);
    const normalizedSnapshot = sanitizeSnapshot(args.snapshot);
    const latestActive = await getLatestForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      activeOnly: true,
    });
    const recentSameIntent = latestActive && (() => {
      const updatedAtMs = new Date(latestActive.updated_at).getTime();
      if (!Number.isFinite(updatedAtMs)) return null;
      if ((nowMs - updatedAtMs) > dedupeWindowMs) return null;
      if ((latestActive.title || undefined) !== normalizedTitle) return null;
      if ((latestActive.root_prompt || undefined) !== normalizedRootPrompt) return null;
      return latestActive;
    })();

    if (recentSameIntent) {
      return { session_id: recentSameIntent._id };
    }

    const activeRows = await listActiveForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      limit: 40,
    });
    for (const row of activeRows) {
      if (!row.active) continue;
      await ctx.db.patch(row._id, { active: false, updated_at: now });
    }

    const id = await ctx.db.insert("work_sessions", {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      title: normalizedTitle,
      title_customized: normalizedTitleCustomized,
      root_prompt: normalizedRootPrompt,
      snapshot: normalizedSnapshot,
      active: true,
      created_at: now,
      updated_at: now,
    });
    await pruneInactiveSessionsForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
    });

    return { session_id: id };
  },
});

export const upsertActiveSession = mutation({
  args: {
    user_id: v.string(),
    module: v.string(),
    brand_id: v.optional(v.id("brand_dna")),
    session_id: v.optional(v.id("work_sessions")),
    title: v.optional(v.string()),
    title_customized: v.optional(v.boolean()),
    root_prompt: v.optional(v.string()),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const moduleKey = ensureModule(args.module);
    const now = new Date().toISOString();
    const sanitizedSnapshot = sanitizeSnapshot(args.snapshot);
    const normalizedTitle = args.title?.trim() || undefined;
    const normalizedTitleCustomized = args.title_customized === true && Boolean(normalizedTitle);
    const normalizedRootPrompt = normalizePrompt(args.root_prompt) || undefined;

    if (args.session_id) {
      const existing = await ctx.db.get(args.session_id);
      if (!existing || existing.user_id !== args.user_id) throw new Error("Session not found");

      if (!existing.active) {
        const rows = await listActiveForScope(ctx, {
          user_id: args.user_id,
          module: moduleKey,
          brand_id: args.brand_id,
          limit: 40,
        });
        for (const row of rows) {
          if (!row.active) continue;
          if (args.brand_id && row.brand_id !== args.brand_id) continue;
          if (!args.brand_id && row.brand_id !== undefined) continue;
          if (row._id === args.session_id) continue;
          await ctx.db.patch(row._id, { active: false, updated_at: now });
        }
      }

      const preserveExistingCustomTitle = args.title_customized === undefined && existing.title_customized === true;
      const nextTitle = preserveExistingCustomTitle
        ? existing.title
        : (normalizedTitle ?? existing.title);
      const nextTitleCustomized = preserveExistingCustomTitle
        ? true
        : normalizedTitle !== undefined
          ? normalizedTitleCustomized
          : existing.title_customized === true;
      const nextRootPrompt = normalizedRootPrompt ?? existing.root_prompt;
      const snapshotChanged =
        safeStableStringify(existing.snapshot) !== safeStableStringify(sanitizedSnapshot);
      const shouldPatch =
        !existing.active ||
        existing.title !== nextTitle ||
        (existing.title_customized === true) !== nextTitleCustomized ||
        existing.root_prompt !== nextRootPrompt ||
        snapshotChanged;

      if (shouldPatch) {
        await ctx.db.patch(args.session_id, {
          title: nextTitle,
          title_customized: nextTitleCustomized,
          root_prompt: nextRootPrompt,
          snapshot: sanitizedSnapshot,
          active: true,
          updated_at: now,
        });
      }
      return { session_id: args.session_id };
    }

    const current = await getLatestForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      activeOnly: true,
    });

    if (current) {
      const preserveExistingCustomTitle = args.title_customized === undefined && current.title_customized === true;
      const nextTitle = preserveExistingCustomTitle
        ? current.title
        : (normalizedTitle ?? current.title);
      const nextTitleCustomized = preserveExistingCustomTitle
        ? true
        : normalizedTitle !== undefined
          ? normalizedTitleCustomized
          : current.title_customized === true;
      const nextRootPrompt = normalizedRootPrompt ?? current.root_prompt;
      const nextBrandId = args.brand_id ?? current.brand_id;
      const snapshotChanged =
        safeStableStringify(current.snapshot) !== safeStableStringify(sanitizedSnapshot);
      const shouldPatch =
        !current.active ||
        current.title !== nextTitle ||
        (current.title_customized === true) !== nextTitleCustomized ||
        current.root_prompt !== nextRootPrompt ||
        current.brand_id !== nextBrandId ||
        snapshotChanged;

      if (shouldPatch) {
        await ctx.db.patch(current._id, {
          brand_id: nextBrandId,
          title: nextTitle,
          title_customized: nextTitleCustomized,
          root_prompt: nextRootPrompt,
          snapshot: sanitizedSnapshot,
          active: true,
          updated_at: now,
        });
      }
      return { session_id: current._id };
    }

    const created = await ctx.db.insert("work_sessions", {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
      title: normalizedTitle,
      title_customized: normalizedTitleCustomized,
      root_prompt: normalizedRootPrompt,
      snapshot: sanitizedSnapshot,
      active: true,
      created_at: now,
      updated_at: now,
    });
    await pruneInactiveSessionsForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: args.brand_id,
    });

    return { session_id: created };
  },
});

export const activateSession = mutation({
  args: {
    user_id: v.string(),
    session_id: v.id("work_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== args.user_id) throw new Error("Session not found");

    const moduleKey = ensureModule(session.module);
    const now = new Date().toISOString();

    const rows = await listActiveForScope(ctx, {
      user_id: args.user_id,
      module: moduleKey,
      brand_id: session.brand_id,
      limit: 40,
    });

    for (const row of rows) {
      if (!row.active) continue;
      if (row.brand_id !== session.brand_id) continue;
      if (row._id === session._id) continue;
      await ctx.db.patch(row._id, { active: false, updated_at: now });
    }

    await ctx.db.patch(session._id, { active: true, updated_at: now });
    const refreshed = await ctx.db.get(session._id);
    if (!refreshed) return null;
    const snapshot = await resolveSnapshotImageUrls(ctx, refreshed.snapshot);
    return {
      ...refreshed,
      snapshot,
    };
  },
});

export const deleteSession = mutation({
  args: {
    user_id: v.string(),
    session_id: v.id("work_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.session_id);
    if (!session || session.user_id !== args.user_id) throw new Error("Session not found");

    const moduleKey = ensureModule(session.module);
    const brandId = session.brand_id;

    await ctx.db.delete(args.session_id);

    const remaining = await ctx.db
      .query("work_sessions")
      .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", moduleKey))
      .order("desc")
      .take(200);

    const sameScope = remaining.filter((row) => row.brand_id === brandId);
    if (!sameScope.length) {
      return { deleted: true, next_session_id: null as string | null };
    }

    const nextActive = sameScope[0];
    const now = new Date().toISOString();
    for (const row of sameScope) {
      await ctx.db.patch(row._id, { active: row._id === nextActive._id, updated_at: now });
    }

    return { deleted: true, next_session_id: String(nextActive._id) };
  },
});

export const clearSessions = mutation({
  args: {
    user_id: v.string(),
    module: v.string(),
    brand_id: v.optional(v.id("brand_dna")),
  },
  handler: async (ctx, args) => {
    const moduleKey = ensureModule(args.module);
    const targets = args.brand_id
      ? await ctx.db
          .query("work_sessions")
          .withIndex("by_user_brand_module_updated", (q) =>
            q.eq("user_id", args.user_id).eq("brand_id", args.brand_id).eq("module", moduleKey),
          )
          .order("desc")
          .take(500)
      : (await ctx.db
          .query("work_sessions")
          .withIndex("by_user_module_updated", (q) => q.eq("user_id", args.user_id).eq("module", moduleKey))
          .order("desc")
          .take(500)).filter((row) => row.brand_id === undefined);
    for (const row of targets) {
      await ctx.db.delete(row._id);
    }

    return { deleted: targets.length };
  },
});

export const sanitizeSessions = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("work_sessions").collect();
    const dryRun = args.dryRun === true;
    const grouped = new Map<string, typeof rows>();

    for (const row of rows) {
      const scopeKey = `${row.user_id}::${row.module}::${row.brand_id ?? "no-brand"}`;
      const bucket = grouped.get(scopeKey);
      if (bucket) {
        bucket.push(row);
      } else {
        grouped.set(scopeKey, [row]);
      }
    }

    let deleted = 0;
    let reactivated = 0;
    const deletedIds: string[] = [];
    const reactivatedScopes: Array<{ scope: string; activeSessionId: string }> = [];
    const duplicateGroups: Array<{ scope: string; fingerprint: string; count: number; kept: string; removed: string[] }> = [];

    for (const [scope, bucket] of grouped.entries()) {
      const sorted = [...bucket].sort(compareSessionsForKeep);
      const keepByFingerprint = new Map<string, typeof sorted[number]>();
      const toDelete: typeof sorted = [];

      for (const row of sorted) {
        const fingerprint = buildSessionFingerprint(row);
        const existing = keepByFingerprint.get(fingerprint);
        if (existing) {
          toDelete.push(row);
          const group = duplicateGroups.find((item) => item.scope === scope && item.fingerprint === fingerprint);
          if (group) {
            group.removed.push(String(row._id));
            group.count += 1;
          } else {
            duplicateGroups.push({
              scope,
              fingerprint,
              count: 2,
              kept: String(existing._id),
              removed: [String(row._id)],
            });
          }
          continue;
        }
        keepByFingerprint.set(fingerprint, row);
      }

      const kept = [...keepByFingerprint.values()].sort(compareSessionsForKeep);
      const desiredActive = kept.find((row) => row.active) ?? kept[0] ?? null;

      if (desiredActive) {
        for (const row of kept) {
          const shouldBeActive = row._id === desiredActive._id;
          if (row.active !== shouldBeActive) {
            reactivated += 1;
            if (!dryRun) {
              await ctx.db.patch(row._id, {
                active: shouldBeActive,
                updated_at: row.updated_at,
              });
            }
          }
        }

        if (kept.filter((row) => row.active).length !== 1) {
          reactivatedScopes.push({
            scope,
            activeSessionId: String(desiredActive._id),
          });
        }
      }

      for (const row of toDelete) {
        deleted += 1;
        deletedIds.push(String(row._id));
        if (!dryRun) {
          await ctx.db.delete(row._id);
        }
      }
    }

    return {
      dryRun,
      total: rows.length,
      scopes: grouped.size,
      deleted,
      reactivated,
      duplicateGroups: duplicateGroups.slice(0, 50),
      deletedIds: deletedIds.slice(0, 200),
      reactivatedScopes: reactivatedScopes.slice(0, 50),
    };
  },
});

export const compactStoredSnapshots = mutation({
  args: {
    admin_email: v.string(),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    module: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    const dryRun = args.dryRun === true;
    const takeLimit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const moduleFilter = args.module ? ensureModule(args.module) : null;
    const rows = await ctx.db.query("work_sessions").order("desc").take(takeLimit);

    let scanned = 0;
    let compacted = 0;
    let bytesBefore = 0;
    let bytesAfter = 0;

    for (const row of rows) {
      if (moduleFilter && row.module !== moduleFilter) continue;
      scanned += 1;
      const before = safeStableStringify(row.snapshot);
      const nextSnapshot = sanitizeSnapshot(row.snapshot);
      const after = safeStableStringify(nextSnapshot);
      bytesBefore += before.length;
      bytesAfter += after.length;

      if (before === after) continue;
      compacted += 1;
      if (!dryRun) {
        await ctx.db.patch(row._id, {
          snapshot: nextSnapshot,
        });
      }
    }

    return {
      dryRun,
      scanned,
      compacted,
      bytesBefore,
      bytesAfter,
      bytesSaved: Math.max(0, bytesBefore - bytesAfter),
    };
  },
});
