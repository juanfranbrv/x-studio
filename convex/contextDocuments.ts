import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireSameUser } from "./lib/authz";

const MAX_CHARACTERS = 12_000;
const MAX_TITLE = 100;
const MAX_SOURCE_FILENAME = 255;
const MAX_PER_BRAND = 20;

const contextDocumentValidator = v.object({
  _id: v.id("brand_context_documents"),
  _creationTime: v.number(),
  brand_id: v.id("brand_dna"),
  title: v.string(),
  content: v.string(),
  source_filename: v.optional(v.string()),
  character_count: v.number(),
  is_active: v.boolean(),
  created_at: v.string(),
});

const contextDocumentMetadataValidator = v.object({
  _id: v.id("brand_context_documents"),
  _creationTime: v.number(),
  brand_id: v.id("brand_dna"),
  title: v.string(),
  source_filename: v.optional(v.string()),
  character_count: v.number(),
  is_active: v.boolean(),
  created_at: v.string(),
});

type AnyCtx = QueryCtx | MutationCtx;

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function validateDocumentInput(input: {
  title: string;
  content: string;
  source_filename?: string;
}): void {
  if (!input.title.trim()) {
    throw new Error("title_required");
  }
  if (countCharacters(input.title) > MAX_TITLE) {
    throw new Error("title_too_long");
  }
  if (!input.content.trim()) {
    throw new Error("content_required");
  }
  if (countCharacters(input.content) > MAX_CHARACTERS) {
    throw new Error("content_too_long");
  }
  if (
    input.source_filename !== undefined &&
    countCharacters(input.source_filename) > MAX_SOURCE_FILENAME
  ) {
    throw new Error("source_filename_too_long");
  }
}

async function requireOwnedBrand(
  ctx: AnyCtx,
  brandId: Id<"brand_dna">,
  clerkUserId: string,
) {
  const brand = await ctx.db.get(brandId);
  if (!brand || brand.clerk_user_id !== clerkUserId) {
    throw new Error("Forbidden: Brand Kit ownership required");
  }
  return brand;
}

async function requireOwnedDocument(
  ctx: AnyCtx,
  brandId: Id<"brand_dna">,
  documentId: Id<"brand_context_documents">,
) {
  const document = await ctx.db.get(documentId);
  if (!document || document.brand_id !== brandId) {
    throw new Error("context_document_not_found");
  }
  return document;
}

export const listMetadataForBrand = query({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
  },
  returns: v.array(contextDocumentMetadataValidator),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;

    const documents = await ctx.db
      .query("brand_context_documents")
      .withIndex("by_brand", (q) => q.eq("brand_id", args.brand_id))
      .collect();

    return documents.map((document) => ({
      _id: document._id,
      _creationTime: document._creationTime,
      brand_id: document.brand_id,
      title: document.title,
      ...(document.source_filename === undefined
        ? {}
        : { source_filename: document.source_filename }),
      character_count: document.character_count,
      is_active: document.is_active,
      created_at: document.created_at,
    }));
  },
});

export const getForBrand = query({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
    document_id: v.id("brand_context_documents"),
  },
  returns: v.union(v.null(), contextDocumentValidator),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;

    const document = await ctx.db.get(args.document_id);
    return document?.brand_id === args.brand_id ? document : null;
  },
});

export const getActiveForBrand = query({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
  },
  returns: v.union(v.null(), contextDocumentValidator),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;

    const activeRows = await ctx.db
      .query("brand_context_documents")
      .withIndex("by_brand_active", (q) =>
        q.eq("brand_id", args.brand_id).eq("is_active", true),
      )
      .collect();

    if (activeRows.length > 1) {
      throw new Error("multiple_active_context_documents");
    }
    return activeRows[0] ?? null;
  },
});

export const create = mutation({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
    title: v.string(),
    content: v.string(),
    source_filename: v.optional(v.string()),
  },
  returns: v.id("brand_context_documents"),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;
    validateDocumentInput(args);

    const existing = await ctx.db
      .query("brand_context_documents")
      .withIndex("by_brand", (q) => q.eq("brand_id", args.brand_id))
      .take(MAX_PER_BRAND);
    if (existing.length >= MAX_PER_BRAND) {
      throw new Error("context_document_limit_reached");
    }

    return await ctx.db.insert("brand_context_documents", {
      brand_id: args.brand_id,
      title: args.title,
      content: args.content,
      ...(args.source_filename === undefined
        ? {}
        : { source_filename: args.source_filename }),
      character_count: countCharacters(args.content),
      is_active: false,
      created_at: new Date().toISOString(),
    });
  },
});

export const activate = mutation({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
    document_id: v.id("brand_context_documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;
    const target = await requireOwnedDocument(ctx, args.brand_id, args.document_id);

    const activeRows = await ctx.db
      .query("brand_context_documents")
      .withIndex("by_brand_active", (q) =>
        q.eq("brand_id", args.brand_id).eq("is_active", true),
      )
      .collect();
    for (const active of activeRows) {
      await ctx.db.patch(active._id, { is_active: false });
    }
    await ctx.db.patch(target._id, { is_active: true });
    return null;
  },
});

export const deactivate = mutation({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
    document_id: v.id("brand_context_documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;
    const document = await requireOwnedDocument(ctx, args.brand_id, args.document_id);

    if (document.is_active) {
      await ctx.db.patch(document._id, { is_active: false });
    }
    return null;
  },
});

export const remove = mutation({
  args: {
    clerk_user_id: v.string(),
    brand_id: v.id("brand_dna"),
    document_id: v.id("brand_context_documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const brand = await requireOwnedBrand(ctx, args.brand_id, args.clerk_user_id);
    void brand;
    const document = await requireOwnedDocument(ctx, args.brand_id, args.document_id);

    await ctx.db.delete(document._id);
    return null;
  },
});

export const cloneForBrand = mutation({
  args: {
    clerk_user_id: v.string(),
    source_brand_id: v.id("brand_dna"),
    target_brand_id: v.id("brand_dna"),
  },
  returns: v.array(v.id("brand_context_documents")),
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.clerk_user_id);
    const sourceBrand = await requireOwnedBrand(
      ctx,
      args.source_brand_id,
      args.clerk_user_id,
    );
    const targetBrand = await requireOwnedBrand(
      ctx,
      args.target_brand_id,
      args.clerk_user_id,
    );
    void sourceBrand;
    void targetBrand;

    if (args.source_brand_id === args.target_brand_id) {
      throw new Error("context_document_clone_same_brand");
    }

    const [sourceDocuments, targetDocuments] = await Promise.all([
      ctx.db
        .query("brand_context_documents")
        .withIndex("by_brand", (q) => q.eq("brand_id", args.source_brand_id))
        .take(MAX_PER_BRAND),
      ctx.db
        .query("brand_context_documents")
        .withIndex("by_brand", (q) => q.eq("brand_id", args.target_brand_id))
        .take(MAX_PER_BRAND),
    ]);

    if (sourceDocuments.length + targetDocuments.length > MAX_PER_BRAND) {
      throw new Error("context_document_limit_reached");
    }

    const sourceActiveDocument = sourceDocuments.find((document) => document.is_active);
    if (sourceActiveDocument) {
      for (const targetDocument of targetDocuments) {
        if (targetDocument.is_active) {
          await ctx.db.patch(targetDocument._id, { is_active: false });
        }
      }
    }

    const clonedIds: Id<"brand_context_documents">[] = [];
    for (const document of sourceDocuments) {
      const cloneIsActive = document._id === sourceActiveDocument?._id;
      const clonedId = await ctx.db.insert("brand_context_documents", {
        brand_id: args.target_brand_id,
        title: document.title,
        content: document.content,
        ...(document.source_filename === undefined
          ? {}
          : { source_filename: document.source_filename }),
        character_count: document.character_count,
        is_active: cloneIsActive,
        created_at: new Date().toISOString(),
      });
      clonedIds.push(clonedId);
    }
    return clonedIds;
  },
});
