import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

/**
 * Ejercita `convex/postiz.ts` de verdad con `convexTest`, simulando solo la
 * red (`fetch`), no el cliente HTTP: asi el contrato con la API de Postiz
 * (rutas, cabeceras, forma del cuerpo) queda comprobado, no solo mockeado.
 */

const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../**/*.ts");

const ADMIN_CLERK_ID = "clerk-admin";
const ADMIN_EMAIL = "juanfranbrv@gmail.com";
const OTHER_CLERK_ID = "clerk-otro-usuario";
const API_KEY = "clave-secreta-postiz";
const BASE_URL = "https://postiz.ejemplo.com";

function makeBackend() {
  return convexTest(schema, modules);
}

type Backend = ReturnType<typeof makeBackend>;

async function seedUser(t: Backend, clerkId: string, email: string, role: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerk_id: clerkId,
      email,
      created_at: "2026-08-13T00:00:00.000Z",
      credits: 0,
      status: "active",
      role,
    });
  });
}

async function seedCredentials(t: Backend, userId: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("postiz_accounts", {
      user_id: userId,
      base_url: BASE_URL,
      api_key: API_KEY,
      created_at: "2026-08-13T00:00:00.000Z",
      updated_at: "2026-08-13T00:00:00.000Z",
    });
  });
}

const REMOTE_IMAGE_URL = "https://cdn.example.com/imagen.png";

const scheduleArgs = {
  asset_key: "session:abc:gen:1",
  image_url: REMOTE_IMAGE_URL,
  content: "Hola mundo",
  date: "2026-08-21T09:30:00+02:00",
  targets: [{ integrationId: "i-ig", identifier: "instagram" }],
};

const MENSAJE_GENERICO = "No se pudo completar la operacion con Postiz.";

// PNG real de 1x1 pixel transparente: sirve para ejercitar el camino que
// decodifica base64 de verdad (atob + Uint8Array), no solo su forma.
const PNG_1x1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function respuesta(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

/** Respuesta de la descarga de una imagen ya publicada (no de la API de Postiz). */
function respuestaImagen(contentType = "image/png") {
  const bytes = Uint8Array.from(atob(PNG_1x1_BASE64), (c) => c.charCodeAt(0));
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": contentType }),
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  } as unknown as Response);
}

/**
 * Enruta la respuesta simulada segun el destino.
 *
 * Ademas de la API de Postiz cubre la descarga de la imagen remota: desde que
 * la subida es multipart, es esta action (y ya no Postiz) quien se trae los
 * bytes cuando `image_url` es una URL en vez de una data URL.
 */
function fetchRouter(options?: { failCreate?: boolean; contentTypeImagen?: string }) {
  return vi.fn((url: string, _init?: RequestInit) => {
    if (url.startsWith(REMOTE_IMAGE_URL)) {
      return respuestaImagen(options?.contentTypeImagen);
    }
    if (url.includes("/upload")) {
      return respuesta({ id: "m1", path: "https://cdn.postiz.com/x.png" });
    }
    if (url.includes("/posts")) {
      if (options?.failCreate) return respuesta({ msg: "boom" }, 500);
      // Forma REAL de Postiz 2.23.0, la version que corre en la instancia:
      // [{ postId, integration }], sin 'group'.
      return respuesta([{ postId: "p-123", integration: "i-ig" }]);
    }
    if (url.includes("/integrations")) {
      return respuesta([
        { id: "i-ig", name: "Instagram", identifier: "instagram" },
        { id: "i-fb", name: "Facebook (desactivada)", identifier: "facebook", disabled: true },
      ]);
    }
    return respuesta({}, 404);
  });
}

/** El fichero que viaja en el multipart de /upload, o undefined si no se llamo. */
function ficheroSubido(fetchMock: ReturnType<typeof fetchRouter>): File | undefined {
  const llamada = fetchMock.mock.calls.find((call) => (call[0] as string).includes("/upload"));
  if (!llamada) return undefined;
  const body = (llamada[1] as RequestInit).body;
  expect(body).toBeInstanceOf(FormData);
  return (body as FormData).get("file") as File;
}

describe("convex/postiz.ts: scheduleImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("un usuario que no es administrador recibe error y fetch no se llama ni una vez", async () => {
    const t = makeBackend();
    await seedUser(t, OTHER_CLERK_ID, "no-admin@example.com", "user");
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: OTHER_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      // El mensaje debe ser el generico en castellano, nunca el "Forbidden:
      // admin role required" (en ingles) que lanza requireAdmin.
      expect(resultado.error).toBe(MENSAJE_GENERICO);
      expect(resultado.error.toLowerCase()).not.toContain("forbidden");
      expect(resultado.error.toLowerCase()).not.toContain("admin role");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin conexion configurada, error claro y fetch no se llama", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado).toEqual({
      ok: false,
      error: "No hay ningun Postiz configurado todavia.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("camino feliz: sube, crea y anota la pieza como programada", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado).toEqual({ ok: true, groupId: "p-123" });

    const llamadas = fetchMock.mock.calls.map((call) => call[0] as string);
    const posDescarga = llamadas.indexOf(REMOTE_IMAGE_URL);
    const posUpload = llamadas.findIndex((url) => url.includes("/upload"));
    const posCreate = llamadas.findIndex((url) => url.includes("/posts"));
    expect(posDescarga).toBeGreaterThanOrEqual(0);
    expect(posUpload).toBeGreaterThan(posDescarga);
    expect(posCreate).toBeGreaterThan(posUpload);

    // El nombre del fichero DEBE llevar extension: sin ella /posts responde
    // 400 "File must have a valid extension" (el fallo que motivo el cambio
    // de upload-from-url a multipart).
    expect(ficheroSubido(fetchMock)?.name).toBe("x-studio.png");

    const anotacion = await t.run(async (ctx) =>
      ctx.db
        .query("content_asset_annotations")
        .withIndex("by_user_asset", (q) =>
          q.eq("user_id", ADMIN_CLERK_ID).eq("asset_key", scheduleArgs.asset_key),
        )
        .unique(),
    );
    expect(anotacion?.status).toBe("scheduled");
    expect(anotacion?.planned_at).toBe(scheduleArgs.date);
    expect(anotacion?.postiz_group_id).toBe("p-123");
    expect(anotacion?.postiz_base_url).toBe(BASE_URL);
  });

  it("si la creacion del post falla, la anotacion no se escribe", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter({ failCreate: true });
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado.ok).toBe(false);

    const anotacion = await t.run(async (ctx) =>
      ctx.db
        .query("content_asset_annotations")
        .withIndex("by_user_asset", (q) =>
          q.eq("user_id", ADMIN_CLERK_ID).eq("asset_key", scheduleArgs.asset_key),
        )
        .unique(),
    );
    expect(anotacion).toBeNull();
  });

  it("ni el valor devuelto ni el mensaje de error contienen la clave de API", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });

    // Camino feliz.
    vi.stubGlobal("fetch", fetchRouter());
    const exito = await authed.action(api.postiz.scheduleImage, scheduleArgs);
    expect(JSON.stringify(exito)).not.toContain(API_KEY);

    // Camino con error de Postiz (401 -> PostizAuthError, mensaje sin la clave).
    // La descarga de la imagen se deja pasar a proposito: si tambien devolviera
    // 401 el fallo seria el de la descarga y este caso nunca llegaria a Postiz.
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.startsWith(REMOTE_IMAGE_URL)) return respuestaImagen();
        return respuesta({ msg: "No API Key found" }, 401);
      }),
    );
    const fallo = await authed.action(api.postiz.scheduleImage, scheduleArgs);
    expect(fallo.ok).toBe(false);
    if (!fallo.ok) {
      // Mensaje de PostizAuthError, no el de la descarga ni el generico.
      expect(fallo.error.toLowerCase()).toContain("clave");
    }
    expect(JSON.stringify(fallo)).not.toContain(API_KEY);
  });

  it("si Postiz responde 500 con la clave reflejada en el cuerpo, el resultado no la contiene", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });

    // Simula un gateway/proxy delante de Postiz que, en un 500, refleja la
    // cabecera Authorization dentro del cuerpo de la respuesta.
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.startsWith(REMOTE_IMAGE_URL)) return respuestaImagen();
        if (url.includes("/upload")) {
          return respuesta({ id: "m1", path: "https://cdn.postiz.com/x.png" });
        }
        if (url.includes("/posts")) {
          return respuesta(
            { msg: `Internal error. Authorization: ${API_KEY} rejected by upstream gateway` },
            500,
          );
        }
        return respuesta({}, 404);
      }),
    );

    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado.ok).toBe(false);
    expect(JSON.stringify(resultado)).not.toContain(API_KEY);
    if (!resultado.ok) {
      // El resto del mensaje (numero de estado, "***") se conserva: solo se
      // redacta la clave, no se sustituye por el mensaje generico, porque es
      // un error tipado del cliente de Postiz.
      expect(resultado.error).toContain("***");
      expect(resultado.error).toContain("500");
    }
  });

  it("si la publicacion ya se creo en Postiz pero anotar en la Biblioteca falla, el mensaje deja claro que no hay que reprogramar", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);

    // Provoca un fallo REAL (no simulado) dentro de markScheduled: dos filas
    // para el mismo user_id+asset_key rompen el `.unique()` de su query.
    await t.run(async (ctx) => {
      const ahora = "2026-08-13T00:00:00.000Z";
      for (let i = 0; i < 2; i++) {
        await ctx.db.insert("content_asset_annotations", {
          user_id: ADMIN_CLERK_ID,
          asset_key: scheduleArgs.asset_key,
          status: "draft",
          created_at: ahora,
          updated_at: ahora,
        });
      }
    });

    vi.stubGlobal("fetch", fetchRouter());
    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toContain("SI se programo en Postiz");
      expect(resultado.error).toContain("No la vuelvas a programar");
      // La coletilla "Detalle: ..." nunca aportaba informacion (siempre era
      // el mismo mensaje generico) y contradecia el resto del aviso.
      expect(resultado.error).not.toContain("Detalle:");
    }
  });
});

describe("convex/postiz.ts: listChannels", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("un usuario que no es administrador recibe error y fetch no se llama", async () => {
    const t = makeBackend();
    await seedUser(t, OTHER_CLERK_ID, "no-admin@example.com", "user");
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: OTHER_CLERK_ID });
    const resultado = await authed.action(api.postiz.listChannels, {});

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toBe(MENSAJE_GENERICO);
      expect(resultado.error.toLowerCase()).not.toContain("forbidden");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("filtra los canales deshabilitados", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    vi.stubGlobal("fetch", fetchRouter());

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.listChannels, {});

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.channels).toEqual([
        { id: "i-ig", name: "Instagram", identifier: "instagram" },
      ]);
    }
  });
});

describe("convex/postiz.ts: scheduleImage con data URL", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["data URL simple", `data:image/png;base64,${PNG_1x1_BASE64}`],
    [
      "con parametro extra en el tipo (charset)",
      `data:image/png;charset=utf-8;base64,${PNG_1x1_BASE64}`,
    ],
    [
      "con saltos de linea dentro de la base64",
      `data:image/png;base64,${PNG_1x1_BASE64.match(/.{1,20}/g)!.join("\n")}`,
    ],
  ])(
    "%s: los bytes decodificados viajan en el multipart, con nombre .png",
    async (_nombre, dataUrl) => {
      const t = makeBackend();
      await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
      await seedCredentials(t, ADMIN_CLERK_ID);
      const fetchMock = fetchRouter();
      vi.stubGlobal("fetch", fetchMock);

      const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
      const resultado = await authed.action(api.postiz.scheduleImage, {
        ...scheduleArgs,
        image_url: dataUrl,
      });

      expect(resultado.ok).toBe(true);

      const fichero = ficheroSubido(fetchMock);
      expect(fichero?.name).toBe("x-studio.png");
      expect(fichero?.type).toBe("image/png");
      // Los bytes son los de la imagen de verdad, no los de la cadena base64.
      expect(fichero?.size).toBe(atob(PNG_1x1_BASE64).length);

      // Con una data URL no hay nada que descargar: la unica red que se toca
      // es la de Postiz.
      const llamadas = fetchMock.mock.calls.map((call) => call[0] as string);
      expect(llamadas.some((url) => url.startsWith("data:"))).toBe(false);
    },
  );

  it.each([
    ["text/html (no es imagen)", "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="],
    [
      // image/svg+xml empieza por "image/" pero es contenido activo (puede
      // llevar <script>) y Postiz lo publicaria tal cual: debe rechazarse
      // aunque un filtro por prefijo lo dejara pasar.
      "image/svg+xml (activo, no esta en la lista blanca)",
      "data:image/svg+xml;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    ],
  ])(
    "rechaza una data URL cuyo tipo no es una imagen permitida (%s) y no llama a Postiz",
    async (_nombre, dataUrl) => {
      const t = makeBackend();
      await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
      await seedCredentials(t, ADMIN_CLERK_ID);
      const fetchMock = fetchRouter();
      vi.stubGlobal("fetch", fetchMock);

      const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
      const resultado = await authed.action(api.postiz.scheduleImage, {
        ...scheduleArgs,
        image_url: dataUrl,
      });

      expect(resultado.ok).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("exige que 'base64' sea el ultimo parametro de la cabecera, no uno cualquiera", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, {
      ...scheduleArgs,
      // "base64" aparece, pero no es el ultimo parametro: no marca la
      // codificacion, y lo que sigue ("charset=utf-8,...") no es base64 valida.
      image_url: `data:image/png;base64;charset=utf-8,${PNG_1x1_BASE64}`,
    });

    expect(resultado.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no deja nada en Convex Storage: la subida multipart ya no necesita una URL publica", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    vi.stubGlobal("fetch", fetchRouter());

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, {
      ...scheduleArgs,
      image_url: `data:image/png;base64,${PNG_1x1_BASE64}`,
    });

    expect(resultado.ok).toBe(true);
    // Antes se guardaba un blob solo para darle a Postiz una URL descargable,
    // con el consiguiente riesgo de huerfanos si algo fallaba despues.
    const filas = await t.run(async (ctx) => ctx.db.system.query("_storage").collect());
    expect(filas.length).toBe(0);
  });
});

describe("convex/postiz.ts: scheduleImage con imagen remota", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rechaza una URL que no sirve una imagen permitida y no sube nada a Postiz", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    // Una pagina de error HTML devuelta con 200 por un CDN: sin comprobar el
    // tipo acabaria subida a Postiz como si fuera la imagen.
    const fetchMock = fetchRouter({ contentTypeImagen: "text/html" });
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado.ok).toBe(false);
    const llamadas = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(llamadas).toEqual([REMOTE_IMAGE_URL]);
  });

  it("rechaza un esquema que no es http(s) sin tocar la red", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, {
      ...scheduleArgs,
      image_url: "file:///etc/passwd",
    });

    expect(resultado.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el tipo se lee del Content-Type aunque traiga parametros", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter({ contentTypeImagen: "IMAGE/JPEG; charset=binary" });
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, scheduleArgs);

    expect(resultado.ok).toBe(true);
    expect(ficheroSubido(fetchMock)?.name).toBe("x-studio.jpg");
  });
});
