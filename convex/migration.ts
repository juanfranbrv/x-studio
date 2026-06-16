// Funciones INTERNAS para migrar contenido entre deployments (dev -> prod).
// Son internal: solo se pueden invocar con admin/deploy-key (no desde clientes
// publicos). El puente vive en una ruta de servidor local que usa la
// CONVEX_PROD_DEPLOY_KEY para llamarlas contra produccion. Append-only.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Genera una URL de subida al storage del deployment destino.
export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Resuelve el clerk_id de un usuario por email (para asignar la propiedad
// correcta en el deployment destino).
export const findClerkIdByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
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
export const createMigratedSession = internalMutation({
  args: {
    user_id: v.string(),
    module: v.string(),
    title: v.optional(v.string()),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
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
