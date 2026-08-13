import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAdmin, requireSameUser } from "./lib/authz";

/**
 * Credenciales de Postiz por usuario.
 *
 * Hoy la funcionalidad esta restringida al administrador, pero el modelo ya es
 * por usuario para que abrirla no obligue a migrar nada.
 */

type PostizCtx = QueryCtx | MutationCtx;

async function requirePostizUser(ctx: PostizCtx, clerkUserId: string) {
  await requireAdmin(ctx);
  await requireSameUser(ctx, clerkUserId);
}

const buscar = async (ctx: PostizCtx, userId: string) =>
  await ctx.db
    .query("postiz_accounts")
    .withIndex("by_user", (q) => q.eq("user_id", userId))
    .first();

/** Apta para el cliente: dice si hay conexion, nunca la clave. */
export const getStatus = query({
  args: { clerk_user_id: v.string() },
  handler: async (ctx, args) => {
    await requirePostizUser(ctx, args.clerk_user_id);
    const fila = await buscar(ctx, args.clerk_user_id);
    return { configured: !!fila, base_url: fila?.base_url };
  },
});

/** SOLO desde servidor. No invocar jamas desde un componente de cliente. */
export const getCredentials = query({
  args: { clerk_user_id: v.string() },
  handler: async (ctx, args) => {
    await requirePostizUser(ctx, args.clerk_user_id);
    const fila = await buscar(ctx, args.clerk_user_id);
    if (!fila) return null;
    return { base_url: fila.base_url, api_key: fila.api_key };
  },
});

export const save = mutation({
  args: {
    clerk_user_id: v.string(),
    base_url: v.string(),
    api_key: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePostizUser(ctx, args.clerk_user_id);
    const ahora = new Date().toISOString();
    const fila = await buscar(ctx, args.clerk_user_id);
    // Se normaliza el origen aqui para que el cliente HTTP no tenga que adivinar.
    const base_url = args.base_url.trim().replace(/\/+$/, "");

    if (fila) {
      await ctx.db.patch(fila._id, { base_url, api_key: args.api_key, updated_at: ahora });
      return null;
    }
    await ctx.db.insert("postiz_accounts", {
      user_id: args.clerk_user_id,
      base_url,
      api_key: args.api_key,
      created_at: ahora,
      updated_at: ahora,
    });
    return null;
  },
});
