// Funciones para migrar contenido entre deployments (dev -> prod), append-only.
// Son PUBLICAS pero protegidas por un secreto compartido (MIGRATION_SECRET, env
// del deployment) porque las funciones `internal` no se pueden invocar desde un
// ConvexHttpClient externo. El puente (ruta de servidor local) envia el mismo
// secreto que debe coincidir con el configurado en produccion.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function assertSecret(secret: string) {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("unauthorized: MIGRATION_SECRET invalido o no configurado en el deployment destino");
  }
}

// Genera una URL de subida al storage del deployment destino.
export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    return await ctx.storage.generateUploadUrl();
  },
});

// Resuelve el clerk_id de un usuario por email en el deployment destino.
export const findClerkIdByEmail = query({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    const email = args.email.trim().toLowerCase();
    if (!email) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return user ? user.clerk_id : null;
  },
});

// Inserta (append-only) una work_session migrada. No toca nada existente.
export const createMigratedSession = mutation({
  args: {
    secret: v.string(),
    user_id: v.string(),
    module: v.string(),
    title: v.optional(v.string()),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    const now = new Date().toISOString();
    const id = await ctx.db.insert("work_sessions", {
      user_id: args.user_id,
      module: args.module,
      title: args.title,
      snapshot: args.snapshot,
      active: false,
      created_at: now,
      updated_at: now,
    });
    return String(id);
  },
});
