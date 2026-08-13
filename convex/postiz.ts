import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

// Nombres de las clases de error tipadas del cliente de Postiz
// (convex/lib/postiz/errors.ts). Sus mensajes ya estan en castellano y no
// filtran semantica interna, asi que se conservan tal cual (redactando la
// clave si el propio Postiz o un proxy la reflejo en el cuerpo). Cualquier
// otro error (autorizacion, validacion propia, fallo inesperado de Convex)
// se sustituye por un mensaje generico: ni "Forbidden: admin role required"
// ni ningun otro detalle interno debe llegar al cliente.
const NOMBRES_ERROR_POSTIZ = new Set([
  "PostizAuthError",
  "PostizUnreachableError",
  "PostizRateLimitError",
  "PostizResponseError",
  "PostizShapeError",
]);

function esErrorDeClientePostiz(err: unknown): err is Error {
  return err instanceof Error && NOMBRES_ERROR_POSTIZ.has(err.name);
}

// Sustituye toda aparicion literal de la clave por "***". Solo tiene sentido
// llamarla sobre mensajes que se conservan (los de PostizXError): el mensaje
// generico de abajo no puede contener la clave porque no reutiliza el
// mensaje original.
function redactarClave(mensaje: string, apiKey?: string): string {
  if (!apiKey) return mensaje;
  return mensaje.split(apiKey).join("***");
}

const MENSAJE_GENERICO = "No se pudo completar la operacion con Postiz.";

function toErrorMessage(err: unknown, apiKey?: string): string {
  if (esErrorDeClientePostiz(err)) {
    return redactarClave(err.message, apiKey);
  }
  return MENSAJE_GENERICO;
}

const SIN_CONEXION = "No hay ningun Postiz configurado todavia.";

type ImagenResuelta = {
  url: string;
  // Id del blob que ESTA funcion guardo en Convex Storage al decodificar una
  // data URL. null cuando `imageUrl` ya era una URL remota: esa imagen no la
  // subimos nosotros y nunca debe borrarse desde aqui.
  storageId: Id<"_storage"> | null;
};

// Decodifica base64 con API web estandar (atob + Uint8Array), no `Buffer`:
// `Buffer` es de Node y este fichero no declara "use node", por lo que corre
// en el runtime por defecto de Convex, que no lo expone.
function base64ABytes(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sube una data URL a Convex Storage y devuelve su URL publica.
 *
 * Postiz descarga la imagen por HTTP (`uploadFromUrl`), asi que necesita una
 * URL alcanzable desde fuera; una data URL no sirve. No se reutiliza
 * `persistGeneratedImage` de `src/lib/campaigns/`: depende del cliente
 * Convex de Next (`authedFetchMutation`/`authedFetchQuery`), que no aplica
 * dentro de una action de Convex, que ya tiene `ctx.storage` directamente.
 *
 * El parseo no usa una unica regexp con `;base64,` pegado al tipo: eso
 * revienta con parametros extra en el tipo (`;charset=utf-8`) y no admite
 * saltos de linea dentro de la base64. Se parte a mano en la primera coma.
 */
async function resolvePublicImageUrl(ctx: ActionCtx, imageUrl: string): Promise<ImagenResuelta> {
  const value = imageUrl.trim();
  if (!value.startsWith("data:")) return { url: value, storageId: null };

  const comaIdx = value.indexOf(",");
  if (comaIdx === -1) {
    throw new Error("La imagen no tiene un formato de data URL reconocible.");
  }
  const cabecera = value.slice("data:".length, comaIdx);
  const datos = value.slice(comaIdx + 1);

  const partesCabecera = cabecera.split(";").map((parte) => parte.trim());
  const mimeType = partesCabecera[0] || "";
  const esBase64 = partesCabecera.slice(1).includes("base64");
  if (!mimeType || !esBase64) {
    throw new Error("La imagen no tiene un formato de data URL reconocible.");
  }
  if (!mimeType.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen (tipo image/*).");
  }

  // Los saltos de linea son validos dentro de una data URL base64; se
  // eliminan junto con cualquier otro espacio antes de decodificar.
  const base64 = datos.replace(/\s+/g, "");
  const bytes = base64ABytes(base64);
  // El tipado de BlobPart exige un ArrayBufferView<ArrayBuffer>; el `Uint8Array`
  // recien creado ya usa un ArrayBuffer real (nunca SharedArrayBuffer), asi
  // que el cast solo ajusta el tipo, no el valor en tiempo de ejecucion.
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mimeType });

  const storageId = await ctx.storage.store(blob);
  const url = await ctx.storage.getUrl(storageId);
  if (!url) {
    await ctx.storage.delete(storageId);
    throw new Error("No se pudo generar una URL publica para la imagen.");
  }
  return { url, storageId };
}

export const listChannels = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ ok: true; channels: PostizIntegration[] } | { ok: false; error: string }> => {
    let apiKey: string | undefined;
    try {
      const clerkUserId = await ctx.runQuery(internal.postiz.requireAdminIdentity, {});

      const fila = await ctx.runQuery(internal.postizAccounts.getCredentials, {
        clerk_user_id: clerkUserId,
      });
      if (!fila) {
        return { ok: false, error: SIN_CONEXION };
      }
      apiKey = fila.api_key;

      const integraciones = await listIntegrations(toCredentials(fila));
      const channels = integraciones.filter((integracion) => !integracion.disabled);
      return { ok: true, channels };
    } catch (err) {
      return { ok: false, error: toErrorMessage(err, apiKey) };
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
    let apiKey: string | undefined;
    // Blob que esta ejecucion guardo en Convex Storage al decodificar una
    // data URL (null si `image_url` ya era una URL remota). Se borra si la
    // subida a Postiz o la creacion del post fallan; nunca si lo que llego
    // era una URL ajena.
    let uploadedStorageId: Id<"_storage"> | null = null;
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
      apiKey = fila.api_key;

      // 3. Sin destinos no hay nada que programar.
      if (args.targets.length === 0) {
        return { ok: false, error: "Selecciona al menos una red antes de programar." };
      }

      const credenciales = toCredentials(fila);
      const targets: ScheduleTarget[] = args.targets;

      // 4. Resuelve una URL publica para la imagen (sube si es una data URL).
      const resuelto = await resolvePublicImageUrl(ctx, args.image_url);
      uploadedStorageId = resuelto.storageId;

      let groupId: string;
      try {
        // 5. Sube la imagen a Postiz.
        const media = await uploadFromUrl(credenciales, resuelto.url);

        // 6. Crea el post programado.
        ({ groupId } = await createPost(credenciales, {
          date: args.date,
          content: args.content,
          media,
          targets,
        }));
      } catch (err) {
        // La subida o la creacion fallaron: el blob que guardamos en Convex
        // Storage ya no sirve para nada, se queda huerfano si no se borra.
        if (uploadedStorageId) {
          await ctx.storage.delete(uploadedStorageId);
        }
        throw err;
      }

      // 7. La publicacion YA esta programada en Postiz en este punto. Si lo
      // que falla ahora es el registro interno, el usuario debe enterarse de
      // que NO tiene que reintentar (reintentar duplicaria el post).
      try {
        await ctx.runMutation(internal.contentLibrary.markScheduled, {
          user_id: clerkUserId,
          asset_key: args.asset_key,
          planned_at: args.date,
          postiz_group_id: groupId,
          postiz_base_url: credenciales.baseUrl,
        });
      } catch (err) {
        const detalle = toErrorMessage(err, apiKey);
        return {
          ok: false,
          error:
            "La publicacion SI se programo en Postiz, pero fallo el registro interno en la " +
            `Biblioteca. No la vuelvas a programar (evitas duplicados). Detalle: ${detalle}`,
        };
      }

      return { ok: true, groupId };
    } catch (err) {
      return { ok: false, error: toErrorMessage(err, apiKey) };
    }
  },
});
