import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const MAX_INLINE_IMAGE_DATA_URL_CHARS = 240_000;

const isAdmin = (email: string) => ADMIN_EMAILS.includes((email || "").toLowerCase().trim());

function compactImageUrl(url: unknown): string {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return "";
  if (!value.startsWith("data:")) return value;
  if (value.length > MAX_INLINE_IMAGE_DATA_URL_CHARS) return "";
  return value;
}

function ensureValidImageUrl(url: unknown): string {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) throw new Error("La imagen de la plantilla es obligatoria.");
  if (value.startsWith("data:")) {
    throw new Error("No se admite data URL en image_url. Guarda una URL servida desde storage.");
  }
  return value;
}

function ensureOptionalImageUrl(url: unknown): string | undefined {
  if (url === undefined || url === null) return undefined;
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return undefined;
  if (value.startsWith("data:")) {
    throw new Error("No se admite data URL en thumbnail_url.");
  }
  return value;
}

function normalizeTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  return title.slice(0, 120);
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("replace_templates")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();

    return rows.map((row) => ({
      _id: row._id,
      title: row.title,
      image_url: compactImageUrl(row.thumbnail_url ?? row.image_url),
      full_image_url: compactImageUrl(row.image_url),
      thumbnail_url: compactImageUrl(row.thumbnail_url),
      sort_order: row.sort_order,
      updated_at: row.updated_at,
    }));
  },
});

export const listAllForAdmin = query({
  args: {
    admin_email: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

    const rows = await ctx.db
      .query("replace_templates")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();

    return rows.map((row) => ({
      _id: row._id,
      title: row.title,
      image_url: compactImageUrl(row.thumbnail_url ?? row.image_url),
      full_image_url: compactImageUrl(row.image_url),
      thumbnail_url: compactImageUrl(row.thumbnail_url),
      sort_order: row.sort_order,
      updated_at: row.updated_at,
      created_at: row.created_at,
      updated_by: row.updated_by,
    }));
  },
});

export const create = mutation({
  args: {
    admin_email: v.string(),
    title: v.string(),
    image_url: v.string(),
    thumbnail_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");

    const title = normalizeTitle(args.title);
    if (!title) throw new Error("El titulo de la plantilla es obligatorio.");

    const highest = await ctx.db
      .query("replace_templates")
      .withIndex("by_sort_order")
      .order("desc")
      .take(1);

    const now = new Date().toISOString();
    const nextSortOrder = (highest[0]?.sort_order || 0) + 1;

    return await ctx.db.insert("replace_templates", {
      title,
      image_url: ensureValidImageUrl(args.image_url),
      thumbnail_url: ensureOptionalImageUrl(args.thumbnail_url),
      sort_order: nextSortOrder,
      created_at: now,
      updated_at: now,
      updated_by: args.admin_email,
    });
  },
});

export const remove = mutation({
  args: {
    admin_email: v.string(),
    id: v.id("replace_templates"),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
