import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Helpers de autorización para las funciones Convex.
 *
 * Diseño (ver docs/SANEAMIENTO.md, Fase 2): las funciones conservan su firma
 * histórica (reciben `clerk_id` como argumento) para no tocar ~200 call sites,
 * pero ese argumento deja de ser fuente de verdad: aquí se exige un JWT de
 * Clerk válido (ctx.auth) y que su `subject` coincida con el argumento.
 *
 * Escape operativo: si el operador define AUTH_ENFORCEMENT=off en el entorno
 * del deployment Convex, la verificación se desactiva (solo accesible por el
 * operador del deployment, nunca por un cliente).
 */

type AnyCtx = QueryCtx | MutationCtx;

function enforcementDisabled(): boolean {
    return process.env.AUTH_ENFORCEMENT === "off";
}

/** Devuelve la identidad verificada o lanza. */
export async function requireIdentity(ctx: AnyCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        if (enforcementDisabled()) return null;
        throw new Error("Unauthorized: missing or invalid credentials");
    }
    return identity;
}

/**
 * Exige identidad y que el `clerk_id` recibido como argumento coincida con
 * el subject del JWT. Devuelve el clerk_id verificado.
 */
export async function requireSameUser(ctx: AnyCtx, argClerkId: string): Promise<string> {
    const identity = await requireIdentity(ctx);
    if (!identity) return argClerkId; // enforcement off
    if (identity.subject !== argClerkId) {
        throw new Error("Forbidden: clerk_id does not match authenticated identity");
    }
    return identity.subject;
}

/**
 * Acceso interno servidor→Convex para llamadas sin sesión de usuario
 * (webhooks). La clave vive en el env del deployment (reutilizamos
 * STRIPE_INTERNAL_SECRET, ya provisionada en dev y prod; INTERNAL_ACCESS_KEY
 * tiene prioridad si se define).
 */
export function assertInternalAccess(accessKey: string): void {
    if (enforcementDisabled()) return;
    const expected = process.env.INTERNAL_ACCESS_KEY || process.env.STRIPE_INTERNAL_SECRET || "";
    if (!expected || accessKey !== expected) {
        throw new Error("Unauthorized: invalid internal access key");
    }
}

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];

/**
 * Exige identidad y rol de admin. El email se resuelve desde la tabla `users`
 * (clerk_id verificado), nunca desde un argumento del cliente.
 */
export async function requireAdmin(ctx: AnyCtx): Promise<string> {
    const identity = await requireIdentity(ctx);
    if (!identity) return "enforcement-off";

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_id", identity.subject))
        .first();

    const email = (user?.email ?? identity.email ?? "").toLowerCase().trim();
    if (!email || !ADMIN_EMAILS.includes(email)) {
        throw new Error("Forbidden: admin role required");
    }
    return identity.subject;
}
