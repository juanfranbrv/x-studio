import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import fs from "node:fs";
import path from "node:path";

const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../**/*.ts");

const ADMIN_ID = "admin-clerk-id";
const SOURCE_ID = "source-clerk-id";
const TARGET_ID = "target-clerk-id";

function makeBackend() {
  return convexTest(schema, modules);
}

async function seedAdmin(t: ReturnType<typeof makeBackend>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerk_id: ADMIN_ID,
      email: "juanfranbrv@gmail.com",
      created_at: "2026-08-14T00:00:00.000Z",
      credits: 0,
      status: "active",
      role: "admin",
    });
    await ctx.db.insert("users", {
      clerk_id: TARGET_ID,
      email: "target@example.com",
      created_at: "2026-08-14T00:00:00.000Z",
      credits: 0,
      status: "active",
      role: "user",
    });
  });
}

describe("migración explícita de propiedad", () => {
  it("retira la reconciliación pública parcial basada solo en correo", () => {
    const usersSource = fs.readFileSync(path.resolve(__dirname, "../users.ts"), "utf8");
    expect(usersSource).not.toContain("export const reconcileUserByEmail");
    expect(usersSource).not.toContain("migrateUserOwnershipIfNeeded");
  });

  it("impide que el login reasigne datos por coincidencia de correo", async () => {
    const t = makeBackend();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerk_id: TARGET_ID,
        email: "misma-identidad@example.com",
        created_at: "2026-08-14T00:00:00.000Z",
        credits: 0,
        status: "active",
        role: "user",
      });
    });

    await expect(
      t.withIdentity({ subject: SOURCE_ID }).mutation(api.users.upsertUser, {
        clerk_id: SOURCE_ID,
        email: "misma-identidad@example.com",
      }),
    ).rejects.toThrow("identity_email_conflict");
  });

  it("inspecciona todas las familias directas sin modificar datos", async () => {
    const t = makeBackend();
    await seedAdmin(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("content_campaigns", {
        user_id: SOURCE_ID,
        name: "Campaña",
        created_at: "2026-08-14T00:00:00.000Z",
        updated_at: "2026-08-14T00:00:00.000Z",
      });
      await ctx.db.insert("economic_audit_events", {
        phase: "generate_image",
        model: "configured-model",
        kind: "image",
        estimated_cost_eur: 0,
        user_clerk_id: SOURCE_ID,
        created_at: "2026-08-14T00:00:00.000Z",
      });
      await ctx.db.insert("postiz_accounts", {
        user_id: SOURCE_ID,
        base_url: "https://postiz.example.com",
        api_key: "test-key",
        created_at: "2026-08-14T00:00:00.000Z",
        updated_at: "2026-08-14T00:00:00.000Z",
      });
    });

    const inspection = await t
      .withIdentity({ subject: ADMIN_ID })
      .query(api.userOwnershipMigration.inspect, {
        source_clerk_id: SOURCE_ID,
        target_clerk_id: TARGET_ID,
      });

    expect(inspection.total).toBe(3);
    expect(inspection.counts).toMatchObject({
      content_campaigns: 1,
      economic_audit_events: 1,
      postiz_accounts: 1,
    });
    const persisted = await t.run(async (ctx) =>
      ctx.db.query("content_campaigns").withIndex("by_user", (q) => q.eq("user_id", SOURCE_ID)).collect(),
    );
    expect(persisted).toHaveLength(1);
  });

  it("rechaza la ejecución completa si hay colisiones de asset_key", async () => {
    const t = makeBackend();
    await seedAdmin(t);
    await t.run(async (ctx) => {
      for (const userId of [SOURCE_ID, TARGET_ID]) {
        await ctx.db.insert("content_asset_annotations", {
          user_id: userId,
          asset_key: "asset-duplicado",
          status: "draft",
          created_at: "2026-08-14T00:00:00.000Z",
          updated_at: "2026-08-14T00:00:00.000Z",
        });
      }
    });

    await expect(
      t.withIdentity({ subject: ADMIN_ID }).mutation(api.userOwnershipMigration.execute, {
        source_clerk_id: SOURCE_ID,
        target_clerk_id: TARGET_ID,
        confirmation: "MIGRATE_SOURCE_TO_TARGET",
      }),
    ).rejects.toThrow("ownership_migration_collisions");

    const sourceRows = await t.run(async (ctx) =>
      ctx.db
        .query("content_asset_annotations")
        .withIndex("by_user_asset", (q) => q.eq("user_id", SOURCE_ID))
        .collect(),
    );
    expect(sourceRows).toHaveLength(1);
  });

  it("conserva la fila users y sus referencias al cambiar de tenant Clerk", async () => {
    const t = makeBackend();
    const sourceUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        clerk_id: SOURCE_ID,
        email: "juanfranbrv@gmail.com",
        created_at: "2026-02-25T20:31:51.771Z",
        credits: 58,
        status: "active",
        role: "admin",
      }),
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("work_sessions", {
        user_id: SOURCE_ID,
        module: "image",
        active: true,
        created_at: "2026-08-14T00:00:00.000Z",
        updated_at: "2026-08-14T00:00:00.000Z",
      });
    });

    const operator = t.withIdentity({
      subject: TARGET_ID,
      email: "juanfranbrv@gmail.com",
    });
    const inspection = await operator.query(api.userOwnershipMigration.inspect, {
      source_clerk_id: SOURCE_ID,
      target_clerk_id: TARGET_ID,
    });

    expect(inspection.collisions).toEqual([]);
    expect(inspection.sourceUserExists).toBe(true);
    expect(inspection.targetUserExists).toBe(false);

    await operator.mutation(api.userOwnershipMigration.execute, {
      source_clerk_id: SOURCE_ID,
      target_clerk_id: TARGET_ID,
      confirmation: "MIGRATE_SOURCE_TO_TARGET",
    });

    const persisted = await t.run(async (ctx) => ({
      source: await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_id", SOURCE_ID))
        .first(),
      target: await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_id", TARGET_ID))
        .first(),
    }));
    expect(persisted.source).toBeNull();
    expect(persisted.target).toMatchObject({
      _id: sourceUserId,
      clerk_id: TARGET_ID,
      credits: 58,
      role: "admin",
    });
  });

  it("reasigna las tablas directas cuando la inspección no encuentra colisiones", async () => {
    const t = makeBackend();
    await seedAdmin(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("work_sessions", {
        user_id: SOURCE_ID,
        module: "image",
        active: true,
        created_at: "2026-08-14T00:00:00.000Z",
        updated_at: "2026-08-14T00:00:00.000Z",
      });
      await ctx.db.insert("content_asset_annotations", {
        user_id: SOURCE_ID,
        asset_key: "asset-unico",
        status: "draft",
        created_at: "2026-08-14T00:00:00.000Z",
        updated_at: "2026-08-14T00:00:00.000Z",
      });
    });

    const result = await t
      .withIdentity({ subject: ADMIN_ID })
      .mutation(api.userOwnershipMigration.execute, {
        source_clerk_id: SOURCE_ID,
        target_clerk_id: TARGET_ID,
        confirmation: "MIGRATE_SOURCE_TO_TARGET",
      });

    expect(result.migrated).toBe(2);
    const persisted = await t.run(async (ctx) => ({
      sessions: await ctx.db
        .query("work_sessions")
        .withIndex("by_user_module", (q) => q.eq("user_id", TARGET_ID))
        .collect(),
      annotations: await ctx.db
        .query("content_asset_annotations")
        .withIndex("by_user_asset", (q) => q.eq("user_id", TARGET_ID))
        .collect(),
    }));
    expect(persisted.sessions).toHaveLength(1);
    expect(persisted.annotations).toHaveLength(1);
  });
});
