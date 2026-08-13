import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireSameUser } from "./lib/authz";
import { createPost, listIntegrations, uploadFile } from "./lib/postiz/client";
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
  // Cualquier otro error (autorizacion, validacion propia, fallo inesperado
  // de Convex) colapsa en el mensaje generico de cara al cliente, pero sin
  // registrarlo se vuelve indepurable en produccion. Se redacta la clave por
  // si el mensaje la menciona antes de mandarlo al log del servidor.
  const mensaje = err instanceof Error ? err.message : String(err);
  console.error("[postiz] Error inesperado:", redactarClave(mensaje, apiKey));
  return MENSAJE_GENERICO;
}

const SIN_CONEXION = "No hay ningun Postiz configurado todavia.";

type ImagenResuelta = {
  blob: Blob;
  /** Nombre con extension: /posts de Postiz exige que el medio la tenga. */
  fileName: string;
};

// Decodifica base64 con API web estandar (atob + Uint8Array), no `Buffer`:
// `Buffer` es de Node y este fichero no declara "use node", por lo que corre
// en el runtime por defecto de Convex, que no lo expone.
//
// El tipo de retorno se declara Uint8Array<ArrayBuffer> (no el generico
// Uint8Array) porque el `new Uint8Array(length)` de abajo ya construye uno
// respaldado por un ArrayBuffer real (nunca SharedArrayBuffer): un tipo
// verificado en el propio helper evita el cast en el punto de uso.
function base64ABytes(base64: string): Uint8Array<ArrayBuffer> {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

// Lista blanca explicita de tipos de imagen aceptados, con la extension que
// le corresponde a cada uno. Un simple prefijo "image/" dejaria pasar
// image/svg+xml, que es contenido activo (puede llevar <script>).
//
// La extension no es cosmetica: /posts de Postiz valida que el `path` del
// medio termine en .png/.jpg/.jpeg/.gif/.webp/.mp4, y ese path sale del
// nombre de fichero que mandamos en el multipart.
const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Tope defensivo al traerse una imagen remota a memoria dentro de la action.
// Postiz rechaza las imagenes de mas de 10 MB, asi que por encima de eso el
// viaje no sirve para nada.
const MAX_BYTES_IMAGEN = 10 * 1024 * 1024;

/**
 * Deja la imagen lista para el multipart de Postiz: bytes + nombre con
 * extension.
 *
 * Acepta las dos formas en que puede llegar `image_url`: una data URL (lo
 * habitual, la imagen recien generada en el lienzo) o una URL remota (una
 * pieza ya persistida). Ya NO se guarda nada en Convex Storage: eso solo
 * existia para darle a Postiz una URL publica que descargar, y la subida
 * multipart le entrega los bytes directamente.
 *
 * El parseo de la data URL no usa una unica regexp con `;base64,` pegado al
 * tipo: eso revienta con parametros extra en el tipo (`;charset=utf-8`) y no
 * admite saltos de linea dentro de la base64. Se parte a mano en la primera
 * coma.
 */
async function resolveImageBlob(imageUrl: string): Promise<ImagenResuelta> {
  const value = imageUrl.trim();
  if (!value.startsWith("data:")) return fetchRemoteImage(value);

  const comaIdx = value.indexOf(",");
  if (comaIdx === -1) {
    throw new Error("La imagen no tiene un formato de data URL reconocible.");
  }
  const cabecera = value.slice("data:".length, comaIdx);
  const datos = value.slice(comaIdx + 1);

  const partesCabecera = cabecera.split(";").map((parte) => parte.trim());
  const mimeType = partesCabecera[0] || "";
  // "base64" debe ser el ULTIMO parametro de la cabecera, no uno cualquiera:
  // con un .includes() suelto, "data:image/png;base64;charset=utf-8,..."
  // colaria (el token "base64" aparece, aunque no marque la codificacion).
  const esBase64 =
    partesCabecera.length > 1 && partesCabecera[partesCabecera.length - 1] === "base64";
  if (!mimeType || !esBase64) {
    throw new Error("La imagen no tiene un formato de data URL reconocible.");
  }
  const extension = EXTENSION_POR_TIPO[mimeType];
  if (!extension) {
    throw new Error("El archivo debe ser una imagen (PNG, JPEG, WebP o GIF).");
  }

  // Los saltos de linea son validos dentro de una data URL base64; se
  // eliminan junto con cualquier otro espacio antes de decodificar.
  const base64 = datos.replace(/\s+/g, "");
  const bytes = base64ABytes(base64);
  if (bytes.byteLength > MAX_BYTES_IMAGEN) {
    throw new Error("La imagen es demasiado grande para publicarla (maximo 10 MB).");
  }

  return {
    blob: new Blob([bytes], { type: mimeType }),
    fileName: `x-studio.${extension}`,
  };
}

/**
 * Descarga una imagen ya publicada para reenviarla a Postiz.
 *
 * Solo http/https: `image_url` llega desde el cliente y sin esta comprobacion
 * un `file:` o similar convertiria esta action en un lector de recursos
 * ajenos. El tipo se toma de la cabecera y se valida contra la misma lista
 * blanca que la data URL, para no acabar mandando a Postiz un HTML de error
 * disfrazado de imagen.
 */
async function fetchRemoteImage(url: string): Promise<ImagenResuelta> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("La imagen no tiene una URL valida.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("La imagen no tiene una URL valida.");
  }

  const respuesta = await fetch(parsed.toString());
  if (!respuesta.ok) {
    throw new Error("No se pudo descargar la imagen para publicarla.");
  }

  // El Content-Type puede traer parametros ("image/png; charset=binary").
  const mimeType = (respuesta.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extension = EXTENSION_POR_TIPO[mimeType];
  if (!extension) {
    throw new Error("El archivo debe ser una imagen (PNG, JPEG, WebP o GIF).");
  }

  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES_IMAGEN) {
    throw new Error("La imagen es demasiado grande para publicarla (maximo 10 MB).");
  }

  return {
    blob: new Blob([bytes], { type: mimeType }),
    fileName: `x-studio.${extension}`,
  };
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

      // 4. Deja la imagen en bytes, con un nombre de fichero con extension.
      const imagen = await resolveImageBlob(args.image_url);

      // 5. Sube la imagen a Postiz (multipart, no upload-from-url: ver el
      //    comentario de `uploadFile` en convex/lib/postiz/client.ts).
      const media = await uploadFile(credenciales, imagen);

      // 6. Crea el post programado.
      const { groupId } = await createPost(credenciales, {
        date: args.date,
        content: args.content,
        media,
        targets,
      });

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
        // El error real se registra en el servidor (nunca en la respuesta:
        // el mensaje al cliente ya deja claro que NO hay que reintentar, una
        // coletilla "Detalle:" generica no aportaba nada mas).
        console.error("[postiz] Post creado en Postiz pero fallo el registro interno.", {
          groupId,
          assetKey: args.asset_key,
          error: err,
        });
        return {
          ok: false,
          error:
            "La publicacion SI se programo en Postiz, pero fallo el registro interno en la " +
            "Biblioteca. No la vuelvas a programar (evitas duplicados).",
        };
      }

      return { ok: true, groupId };
    } catch (err) {
      return { ok: false, error: toErrorMessage(err, apiKey) };
    }
  },
});
