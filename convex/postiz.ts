import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireSameUser } from "./lib/authz";
import { createPost, listIntegrations, uploadFromUrl } from "./lib/postiz/client";
import type { PostizCredentials, PostizIntegration, ScheduleTarget } from "./lib/postiz/types";

/**
 * Orquestacion de la programacion en Postiz.
 *
 * Vive en Convex (no en Next) para que la clave de API de Postiz nunca
 * viaje al navegador: las actions leen las credenciales con `ctx.runQuery`
 * hacia una `internalQuery`, jamas alcanzable desde un cliente, y solo el
 * resultado (canales, groupId, mensaje de error) sale de aqui.
 */

/**
 * Autorizacion para las actions de este fichero.
 *
 * `requireAdmin`/`requireSameUser` (convex/lib/authz.ts) consultan la tabla
 * `users` con `ctx.db`, pero una action NO tiene `ctx.db` (solo `ctx.auth`,
 * `ctx.storage` y `ctx.runQuery`/`ctx.runMutation`). Por eso esos helpers no
 * se pueden llamar tal cual desde una action: se delega en esta
 * `internalQuery`, invocada via `ctx.runQuery`, que si tiene `ctx.db` y
 * reutiliza los mismos helpers sin duplicar su logica.
 *
 * Ni `listChannels` ni `scheduleImage` reciben un `clerk_user_id` como
 * argumento (a diferencia de `postizAccounts.ts`): el usuario se toma
 * siempre de la identidad ya verificada por el JWT (`ctx.auth`), nunca de
 * algo que pueda mandar el cliente. `requireSameUser` se invoca igualmente
 * para seguir la misma convencion que el resto del modulo, aunque aqui
 * compare la identidad consigo misma.
 */
export const requireAdminIdentity = internalQuery({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireAdmin(ctx);
    await requireSameUser(ctx, clerkUserId);
    return clerkUserId;
  },
});

function toCredentials(row: { base_url: string; api_key: string }): PostizCredentials {
  return { baseUrl: row.base_url, apiKey: row.api_key };
}

function toErrorMessage(err: unknown): string {
  // Los errores tipados del cliente (PostizAuthError, PostizUnreachableError,
  // PostizRateLimitError, PostizResponseError, PostizShapeError) ya traen un
  // `.message` en castellano y sin la clave. Cualquier otro error (auth,
  // validacion propia) tambien es una instancia de Error.
  return err instanceof Error ? err.message : "No se pudo completar la operacion con Postiz.";
}

const SIN_CONEXION = "No hay ningun Postiz configurado todavia.";

/**
 * Sube una data URL a Convex Storage y devuelve su URL publica.
 *
 * Postiz descarga la imagen por HTTP (`uploadFromUrl`), asi que necesita una
 * URL alcanzable desde fuera; una data URL no sirve. No se reutiliza
 * `persistGeneratedImage` de `src/lib/campaigns/`: depende del cliente
 * Convex de Next (`authedFetchMutation`/`authedFetchQuery`), que no aplica
 * dentro de una action de Convex, que ya tiene `ctx.storage` directamente.
 */
async function resolvePublicImageUrl(ctx: ActionCtx, imageUrl: string): Promise<string> {
  const value = imageUrl.trim();
  if (!value.startsWith("data:")) return value;

  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("La imagen no tiene un formato de data URL reconocible.");
  }
  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64 || "", "base64");
  const blob = new Blob([bytes], { type: mimeType || "image/png" });

  const storageId = await ctx.storage.store(blob);
  const url = await ctx.storage.getUrl(storageId);
  if (!url) {
    throw new Error("No se pudo generar una URL publica para la imagen.");
  }
  return url;
}

export const listChannels = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ ok: true; channels: PostizIntegration[] } | { ok: false; error: string }> => {
    try {
      const clerkUserId = await ctx.runQuery(internal.postiz.requireAdminIdentity, {});

      const fila = await ctx.runQuery(internal.postizAccounts.getCredentials, {
        clerk_user_id: clerkUserId,
      });
      if (!fila) {
        return { ok: false, error: SIN_CONEXION };
      }

      const integraciones = await listIntegrations(toCredentials(fila));
      const channels = integraciones.filter((integracion) => !integracion.disabled);
      return { ok: true, channels };
    } catch (err) {
      return { ok: false, error: toErrorMessage(err) };
    }
  },
});

export const scheduleImage = action({
  args: {
    asset_key: v.string(),
    image_url: v.string(),
    content: v.string(),
    date: v.string(),
    targets: v.array(v.object({ integrationId: v.string(), identifier: v.string() })),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> => {
    try {
      // 1. Autoriza. Si no es administrador, error y no se llama a Postiz.
      const clerkUserId = await ctx.runQuery(internal.postiz.requireAdminIdentity, {});

      // 2. Lee credenciales. Si no hay, error y no se sube nada.
      const fila = await ctx.runQuery(internal.postizAccounts.getCredentials, {
        clerk_user_id: clerkUserId,
      });
      if (!fila) {
        return { ok: false, error: SIN_CONEXION };
      }

      // 3. Sin destinos no hay nada que programar.
      if (args.targets.length === 0) {
        return { ok: false, error: "Selecciona al menos una red antes de programar." };
      }

      const credenciales = toCredentials(fila);
      const targets: ScheduleTarget[] = args.targets;

      // 4. Resuelve una URL publica para la imagen (sube si es una data URL).
      const publicImageUrl = await resolvePublicImageUrl(ctx, args.image_url);

      // 5. Sube la imagen a Postiz.
      const media = await uploadFromUrl(credenciales, publicImageUrl);

      // 6. Crea el post programado.
      const { groupId } = await createPost(credenciales, {
        date: args.date,
        content: args.content,
        media,
        targets,
      });

      // 7. SIEMPRE en ultimo lugar: si createPost fallo, esto no se ejecuta,
      // y la Biblioteca nunca dice "programada" sobre algo que no se programo.
      await ctx.runMutation(internal.contentLibrary.markScheduled, {
        user_id: clerkUserId,
        asset_key: args.asset_key,
        planned_at: args.date,
        postiz_group_id: groupId,
        postiz_base_url: credenciales.baseUrl,
      });

      return { ok: true, groupId };
    } catch (err) {
      return { ok: false, error: toErrorMessage(err) };
    }
  },
});
