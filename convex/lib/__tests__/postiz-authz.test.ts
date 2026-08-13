import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { convexTest } from "convex-test";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";

const source = fs.readFileSync(path.resolve(__dirname, '../../postizAccounts.ts'), 'utf8')

describe('Autorizacion de las credenciales de Postiz', () => {
    it('exige admin y la identidad del propio usuario en todas las operaciones', () => {
        expect(source).toContain('requireAdmin')
        expect(source).toContain('requireSameUser')
        // Las tres funciones exportadas pasan por el mismo portero.
        expect(source.match(/await requirePostizUser\(ctx, args\.clerk_user_id\)/g)?.length).toBe(3)
    })

    it('la consulta apta para el cliente no devuelve nunca la clave', () => {
        const getStatus = source.slice(source.indexOf('export const getStatus'), source.indexOf('export const getCredentials'))
        expect(getStatus).not.toContain('api_key:')
    })

    it('getCredentials sigue siendo internalQuery, nunca query publica', () => {
        // Guarda contra la regresion que este trabajo arreglo: si alguien
        // vuelve a declarar getCredentials como `query` publica, la clave de
        // Postiz quedaria alcanzable desde el navegador aunque el resto de
        // los tests siguiera en verde.
        expect(source).toMatch(/export const getCredentials = internalQuery\(/)
        expect(source).not.toMatch(/export const getCredentials = query\(/)
    })
})

const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../**/*.ts");

const ADMIN_CLERK_ID = "clerk-admin";
const ADMIN_EMAIL = "juanfranbrv@gmail.com";
const OTHER_CLERK_ID = "clerk-otro-usuario";

function makeBackend() {
  return convexTest(schema, modules);
}

async function seedAdmin(t: ReturnType<typeof makeBackend>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerk_id: ADMIN_CLERK_ID,
      email: ADMIN_EMAIL,
      created_at: "2026-08-13T00:00:00.000Z",
      credits: 0,
      status: "active",
      role: "admin",
    });
  });
}

describe("Comportamiento real de las credenciales de Postiz (convex-test)", () => {
  it("getStatus nunca devuelve la clave, aunque haya credenciales guardadas", async () => {
    const t = makeBackend();
    await seedAdmin(t);
    const authed = t.withIdentity({ subject: ADMIN_CLERK_ID });

    await authed.mutation(api.postizAccounts.save, {
      clerk_user_id: ADMIN_CLERK_ID,
      base_url: "https://postiz.example.com",
      api_key: "clave-secreta",
    });

    const status = await authed.query(api.postizAccounts.getStatus, {
      clerk_user_id: ADMIN_CLERK_ID,
    });

    expect(status).toEqual({
      configured: true,
      base_url: "https://postiz.example.com",
    });
    expect(status).not.toHaveProperty("api_key");
  });

  it("un usuario que no es administrador recibe error en las tres operaciones", async () => {
    const t = makeBackend();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerk_id: OTHER_CLERK_ID,
        email: "no-admin@example.com",
        created_at: "2026-08-13T00:00:00.000Z",
        credits: 0,
        status: "active",
        role: "user",
      });
    });
    const authed = t.withIdentity({ subject: OTHER_CLERK_ID });

    await expect(
      authed.query(api.postizAccounts.getStatus, { clerk_user_id: OTHER_CLERK_ID }),
    ).rejects.toThrow("Forbidden");
    await expect(
      authed.query(internal.postizAccounts.getCredentials, { clerk_user_id: OTHER_CLERK_ID }),
    ).rejects.toThrow("Forbidden");
    await expect(
      authed.mutation(api.postizAccounts.save, {
        clerk_user_id: OTHER_CLERK_ID,
        base_url: "https://postiz.example.com",
        api_key: "clave",
      }),
    ).rejects.toThrow("Forbidden");
  });
});
