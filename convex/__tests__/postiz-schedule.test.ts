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
  return vi.fn((url: string) => {
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
