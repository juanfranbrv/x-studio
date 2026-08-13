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

const scheduleArgs = {
  asset_key: "session:abc:gen:1",
  image_url: "https://cdn.example.com/imagen.png",
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
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

/** Enruta la respuesta simulada segun el camino de la API de Postiz. */
function fetchRouter(options?: { failCreate?: boolean }) {
  return vi.fn((url: string, _init?: RequestInit) => {
    if (url.includes("/upload-from-url")) {
      return respuesta({ id: "m1", path: "https://cdn.postiz.com/x.png" });
    }
    if (url.includes("/posts")) {
      if (options?.failCreate) return respuesta({ msg: "boom" }, 500);
      return respuesta([{ group: "g-123" }]);
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

    expect(resultado).toEqual({ ok: true, groupId: "g-123" });

    const llamadas = fetchMock.mock.calls.map((call) => call[0] as string);
    const posUpload = llamadas.findIndex((url) => url.includes("/upload-from-url"));
    const posCreate = llamadas.findIndex((url) => url.includes("/posts"));
    expect(posUpload).toBeGreaterThanOrEqual(0);
    expect(posCreate).toBeGreaterThan(posUpload);

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
    expect(anotacion?.postiz_group_id).toBe("g-123");
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
    vi.stubGlobal(
      "fetch",
      vi.fn(() => respuesta({ msg: "No API Key found" }, 401)),
    );
    const fallo = await authed.action(api.postiz.scheduleImage, scheduleArgs);
    expect(fallo.ok).toBe(false);
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
        if (url.includes("/upload-from-url")) {
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
    "%s: la imagen decodificada llega a Convex Storage y su URL es la que recibe Postiz",
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

      // La imagen decodificada acaba en Convex Storage...
      const filas = await t.run(async (ctx) => ctx.db.system.query("_storage").collect());
      expect(filas.length).toBe(1);
      expect(filas[0].size).toBe(atob(PNG_1x1_BASE64).length);

      // ...y su URL publica es exactamente la que se le paso a Postiz.
      const storedUrl = await t.run(async (ctx) => ctx.storage.getUrl(filas[0]._id));
      const uploadCall = fetchMock.mock.calls.find((call) =>
        (call[0] as string).includes("/upload-from-url"),
      );
      expect(uploadCall).toBeDefined();
      const cuerpo = JSON.parse((uploadCall![1] as RequestInit).body as string);
      expect(cuerpo.url).toBe(storedUrl);
    },
  );

  it("rechaza una data URL cuyo tipo no es una imagen y no llama a Postiz ni guarda nada", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter();
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, {
      ...scheduleArgs,
      image_url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    });

    expect(resultado.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    const filas = await t.run(async (ctx) => ctx.db.system.query("_storage").collect());
    expect(filas.length).toBe(0);
  });

  it("si crear el post falla, el blob que esta ejecucion subio a Convex Storage se borra", async () => {
    const t = makeBackend();
    await seedUser(t, ADMIN_CLERK_ID, ADMIN_EMAIL, "admin");
    await seedCredentials(t, ADMIN_CLERK_ID);
    const fetchMock = fetchRouter({ failCreate: true });
    vi.stubGlobal("fetch", fetchMock);

    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });
    const resultado = await authed.action(api.postiz.scheduleImage, {
      ...scheduleArgs,
      image_url: `data:image/png;base64,${PNG_1x1_BASE64}`,
    });

    expect(resultado.ok).toBe(false);
    const filas = await t.run(async (ctx) => ctx.db.system.query("_storage").collect());
    expect(filas.length).toBe(0);
  });
});
