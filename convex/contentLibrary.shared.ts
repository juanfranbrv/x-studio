export const CONTENT_ASSET_STATUSES = [
  "draft",
  "selected",
  "ready",
  "published_manual",
  "discarded",
] as const;

export type ContentAssetStatus = (typeof CONTENT_ASSET_STATUSES)[number];
export type ContentAssetModule = "image" | "carousel";
export type ContentAssetType = "image" | "carousel";
export type ParsedContentAssetKey = {
  module: ContentAssetModule;
  sessionId: string;
  generationId: string;
};

export type ContentLibrarySessionRow = {
  _id: string;
  user_id: string;
  module: string;
  brand_id?: string;
  title?: string;
  root_prompt?: string;
  snapshot?: unknown;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ContentAssetAnnotation = {
  user_id: string;
  asset_key: string;
  status: string;
  planned_at?: string;
  platform?: string;
  format?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export function parseContentAssetKey(assetKey: string): ParsedContentAssetKey | null {
  const [module, sessionId, ...rest] = assetKey.split(":");
  const generationId = rest.join(":");
  if ((module !== "image" && module !== "carousel") || !sessionId || !generationId) {
    return null;
  }

  return {
    module,
    sessionId,
    generationId,
  };
}

export type ContentLibrarySlide = {
  index: number;
  title?: string;
  description?: string;
  preview_url?: string;
  original_url?: string;
};

export type ContentLibraryAsset = {
  asset_key: string;
  type: ContentAssetType;
  module: ContentAssetModule;
  user_id: string;
  session_id: string;
  session_title: string;
  brand_id?: string;
  created_at: string;
  updated_at: string;
  preview_url?: string;
  original_url?: string;
  copy?: string;
  prompt?: string;
  platform?: string;
  format?: string;
  status: ContentAssetStatus;
  planned_at?: string;
  notes?: string;
  slide_count?: number;
  slides?: ContentLibrarySlide[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean.length > 0 ? clean : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeStatus(value: unknown): ContentAssetStatus {
  const clean = stringValue(value);
  if (clean && (CONTENT_ASSET_STATUSES as readonly string[]).includes(clean)) {
    return clean as ContentAssetStatus;
  }
  return "draft";
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const clean = stringValue(value);
    if (clean) return clean;
  }
  return undefined;
}

function sessionTitle(session: ContentLibrarySessionRow) {
  return firstString(session.title, session.root_prompt) || "Untitled session";
}

function buildImageAssets(session: ContentLibrarySessionRow, snapshot: Record<string, unknown>): ContentLibraryAsset[] {
  const creationFlowState = asRecord(snapshot.creationFlowState);
  const generations = Array.isArray(snapshot.sessionGenerations)
    ? snapshot.sessionGenerations
    : [];

  return generations
    .map((item, index): ContentLibraryAsset | null => {
      const generation = asRecord(item);
      const id = firstString(generation.id) || `${index}`;
      const previewUrl = firstString(
        generation.preview_image_url,
        generation.image_url,
        generation.original_image_url,
      );
      const originalUrl = firstString(
        generation.original_image_url,
        generation.image_url,
        generation.preview_image_url,
      );
      if (!previewUrl && !originalUrl) return null;

      return {
        asset_key: `image:${session._id}:${id}`,
        type: "image",
        module: "image",
        user_id: session.user_id,
        session_id: session._id,
        session_title: sessionTitle(session),
        brand_id: session.brand_id,
        created_at: firstString(generation.created_at) || session.created_at,
        updated_at: session.updated_at,
        preview_url: previewUrl,
        original_url: originalUrl,
        copy: firstString(
          generation.caption,
          creationFlowState.caption,
          generation.prompt_used,
          snapshot.rootPrompt,
          snapshot.promptValue,
        ),
        prompt: firstString(generation.prompt_used, snapshot.rootPrompt, snapshot.promptValue),
        platform: firstString(generation.platform, creationFlowState.selectedPlatform),
        format: firstString(generation.format, creationFlowState.selectedFormat),
        status: "draft",
      } satisfies ContentLibraryAsset;
    })
    .filter((item): item is ContentLibraryAsset => Boolean(item));
}

function normalizeSlide(item: unknown, fallbackIndex: number): ContentLibrarySlide | null {
  const slide = asRecord(item);
  const previewUrl = firstString(slide.imagePreviewUrl, slide.preview_image_url, slide.imageUrl, slide.image_url);
  const originalUrl = firstString(slide.imageOriginalUrl, slide.original_image_url, slide.imageUrl, slide.image_url);
  if (!previewUrl && !originalUrl) return null;

  return {
    index: numberValue(slide.index) ?? fallbackIndex,
    title: firstString(slide.title),
    description: firstString(slide.description),
    preview_url: previewUrl,
    original_url: originalUrl,
  };
}

function buildCarouselAsset(session: ContentLibrarySessionRow, snapshot: Record<string, unknown>): ContentLibraryAsset | null {
  const previewState = asRecord(snapshot.previewState);
  const slides = Array.isArray(previewState.slides)
    ? previewState.slides.map((slide, index) => normalizeSlide(slide, index)).filter((slide): slide is ContentLibrarySlide => Boolean(slide))
    : [];

  if (slides.length === 0) return null;

  const firstSlide = slides[0];
  return {
    asset_key: `carousel:${session._id}:current`,
    type: "carousel",
    module: "carousel",
    user_id: session.user_id,
    session_id: session._id,
    session_title: sessionTitle(session),
    brand_id: session.brand_id,
    created_at: session.created_at,
    updated_at: session.updated_at,
    preview_url: firstSlide.preview_url || firstSlide.original_url,
    original_url: firstSlide.original_url || firstSlide.preview_url,
    copy: firstString(previewState.caption, snapshot.caption, snapshot.prompt, session.root_prompt),
    prompt: firstString(snapshot.prompt, session.root_prompt),
    platform: firstString(snapshot.selectedPlatform),
    format: firstString(snapshot.aspectRatio),
    status: "draft",
    slide_count: slides.length,
    slides,
  };
}

export function extractContentAssetsFromSessions(sessions: ContentLibrarySessionRow[]): ContentLibraryAsset[] {
  const assets = sessions.flatMap((session) => {
    const snapshot = asRecord(session.snapshot);
    if (session.module === "image" || snapshot.module === "image") {
      return buildImageAssets(session, snapshot);
    }
    if (session.module === "carousel" || snapshot.module === "carousel") {
      const carousel = buildCarouselAsset(session, snapshot);
      return carousel ? [carousel] : [];
    }
    return [];
  });

  return assets.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function mergeContentAssetAnnotations(
  assets: ContentLibraryAsset[],
  annotations: ContentAssetAnnotation[],
): ContentLibraryAsset[] {
  const byKey = new Map(annotations.map((annotation) => [annotation.asset_key, annotation]));

  return assets.map((asset) => {
    const annotation = byKey.get(asset.asset_key);
    if (!annotation) return asset;

    return {
      ...asset,
      status: normalizeStatus(annotation.status),
      planned_at: stringValue(annotation.planned_at),
      platform: stringValue(annotation.platform) || asset.platform,
      format: stringValue(annotation.format) || asset.format,
      notes: stringValue(annotation.notes),
    };
  });
}
