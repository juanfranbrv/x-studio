import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../**/*.ts");
const USER_A = "clerk-user-a";
const USER_B = "clerk-user-b";

function makeBackend() {
  return convexTest(schema, modules);
}

type Backend = ReturnType<typeof makeBackend>;

async function createBrand(t: Backend, clerkUserId: string, name: string) {
  return await t.run(async (ctx) =>
    ctx.db.insert("brand_dna", {
      url: `https://${name}.example.com`,
      brand_name: name,
      tagline: "Tagline",
      business_overview: "Overview",
      brand_values: [],
      tone_of_voice: [],
      visual_aesthetic: [],
      colors: {},
      fonts: [],
      clerk_user_id: clerkUserId,
      updated_at: "2026-08-13T00:00:00.000Z",
    }),
  );
}

function createArgs(brandId: Id<"brand_dna">, title = "Documento") {
  return {
    clerk_user_id: USER_A,
    brand_id: brandId,
    title,
    content: "Contenido de contexto 😀",
    source_filename: "contexto.md",
  };
}

describe("documentos de contexto en Convex", () => {
  it("duplica para el usuario el Brand Kit y hasta 20 documentos en una sola mutación", async () => {
    const t = makeBackend();
    const sourceBrandId = await createBrand(t, USER_A, "origen-usuario");

    await t.run(async (ctx) => {
      await ctx.db.patch(sourceBrandId, {
        slug: "origen-usuario",
        tagline: "Tagline original",
        business_overview: "Resumen original",
        cta_url_enabled: true,
        brand_values: ["Precisión"],
        tone_of_voice: ["Directo"],
        visual_aesthetic: ["Editorial"],
        colors: [{ hex: "#123456" }],
        fonts: [{ family: "Inter" }],
        text_assets: { claims: ["Claim"] },
      });
      for (let index = 0; index < 21; index += 1) {
        await ctx.db.insert("brand_context_documents", {
          brand_id: sourceBrandId,
          title: `Documento ${index + 1}`,
          content: `Contenido ${index + 1}`,
          source_filename: `documento-${index + 1}.md`,
          character_count: `Contenido ${index + 1}`.length,
          is_active: index < 2,
          created_at: `2026-08-13T00:00:${String(index).padStart(2, "0")}.000Z`,
        });
      }
    });

    const targetBrandId = await t
      .withIdentity({ subject: USER_A })
      .mutation(api.brands.duplicateBrandDNAWithContext, {
        source_id: sourceBrandId,
        clerk_user_id: USER_A,
        brand_name: "Copia Usuario",
      });

    const persisted = await t.run(async (ctx) => ({
      brand: await ctx.db.get(targetBrandId),
      documents: await ctx.db
        .query("brand_context_documents")
        .withIndex("by_brand", (q) => q.eq("brand_id", targetBrandId))
        .collect(),
    }));

    expect(persisted.brand).toMatchObject({
      brand_name: "Copia Usuario",
      slug: "copia-usuario",
      clerk_user_id: USER_A,
      tagline: "Tagline original",
      business_overview: "Resumen original",
      cta_url_enabled: true,
      brand_values: ["Precisión"],
      tone_of_voice: ["Directo"],
      visual_aesthetic: ["Editorial"],
      colors: [{ hex: "#123456" }],
      fonts: [{ family: "Inter" }],
      text_assets: { claims: ["Claim"] },
    });
    expect(persisted.brand?._id).not.toBe(sourceBrandId);
    expect(persisted.documents).toHaveLength(20);
    expect(persisted.documents.filter((document) => document.is_active)).toHaveLength(1);
    expect(persisted.documents[0]).toMatchObject({
      brand_id: targetBrandId,
      title: "Documento 1",
      source_filename: "documento-1.md",
      character_count: "Contenido 1".length,
      created_at: "2026-08-13T00:00:00.000Z",
      is_active: true,
    });
  });

  it("rechaza duplicar un Brand Kit ajeno sin crear destino ni documentos parciales", async () => {
    const t = makeBackend();
    const foreignBrandId = await createBrand(t, USER_B, "origen-ajeno");
    await t.run(async (ctx) => {
      await ctx.db.insert("brand_context_documents", {
        brand_id: foreignBrandId,
        title: "Privado",
        content: "Contenido privado",
        character_count: "Contenido privado".length,
        is_active: true,
        created_at: "2026-08-13T00:00:00.000Z",
      });
    });

    await expect(
      t.withIdentity({ subject: USER_A }).mutation(api.brands.duplicateBrandDNAWithContext, {
        source_id: foreignBrandId,
        clerk_user_id: USER_A,
        brand_name: "Copia prohibida",
      }),
    ).rejects.toThrow("Unauthorized");

    const userBrands = await t.run(async (ctx) =>
      ctx.db
        .query("brand_dna")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", USER_A))
        .collect(),
    );
    expect(userBrands).toEqual([]);
  });

  it("elimina en cascada todos los documentos antes de borrar el Brand Kit", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });

    for (const title of ["Primero", "Segundo"]) {
      await authed.mutation(api.contextDocuments.create, createArgs(brandId, title));
    }

    await authed.mutation(api.brands.deleteBrandDNA, {
      id: brandId,
      clerk_user_id: USER_A,
    });

    const persisted = await t.run(async (ctx) => ({
      brand: await ctx.db.get(brandId),
      documents: await ctx.db
        .query("brand_context_documents")
        .withIndex("by_brand", (q) => q.eq("brand_id", brandId))
        .collect(),
    }));
    expect(persisted.brand).toBeNull();
    expect(persisted.documents).toEqual([]);
  });

  it("la clonación administrativa copia como máximo 20 documentos y normaliza el activo", async () => {
    const t = makeBackend();
    const sourceBrandId = await createBrand(t, USER_A, "origen-admin");
    const adminClerkId = "admin-clerk-id";
    const targetClerkId = "target-clerk-id";

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerk_id: adminClerkId,
        email: "juanfranbrv@gmail.com",
        created_at: "2026-08-13T00:00:00.000Z",
        credits: 0,
        status: "active",
        role: "admin",
      });
      for (let index = 0; index < 21; index += 1) {
        await ctx.db.insert("brand_context_documents", {
          brand_id: sourceBrandId,
          title: `Documento ${index + 1}`,
          content: `Contenido ${index + 1}`,
          source_filename: `documento-${index + 1}.md`,
          character_count: `Contenido ${index + 1}`.length,
          is_active: index < 2,
          created_at: `2026-08-13T00:00:${String(index).padStart(2, "0")}.000Z`,
        });
      }
    });

    const targetBrandId = await t
      .withIdentity({ subject: adminClerkId })
      .mutation(api.brands.cloneBrandDNAToUser, {
        source_id: sourceBrandId,
        target_clerk_user_id: targetClerkId,
      });

    const persisted = await t.run(async (ctx) => ({
      brand: await ctx.db.get(targetBrandId),
      documents: await ctx.db
        .query("brand_context_documents")
        .withIndex("by_brand", (q) => q.eq("brand_id", targetBrandId))
        .collect(),
    }));

    expect(persisted.brand?.clerk_user_id).toBe(targetClerkId);
    expect(persisted.documents).toHaveLength(20);
    expect(persisted.documents.filter((document) => document.is_active)).toHaveLength(1);
    expect(persisted.documents[0]).toMatchObject({
      brand_id: targetBrandId,
      title: "Documento 1",
      content: "Contenido 1",
      source_filename: "documento-1.md",
      character_count: "Contenido 1".length,
      is_active: true,
      created_at: "2026-08-13T00:00:00.000Z",
    });
  });

  it("crea un documento válido siempre inactivo y calcula sus caracteres en servidor", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });

    const documentId = await authed.mutation(api.contextDocuments.create, createArgs(brandId));
    const document = await authed.query(api.contextDocuments.getForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
      document_id: documentId,
    });

    expect(document).toMatchObject({
      _id: documentId,
      brand_id: brandId,
      title: "Documento",
      content: "Contenido de contexto 😀",
      source_filename: "contexto.md",
      character_count: Array.from("Contenido de contexto 😀").length,
      is_active: false,
    });
    expect(document?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rechaza una sesión ausente antes de crear", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");

    await expect(t.mutation(api.contextDocuments.create, createArgs(brandId))).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("rechaza una identidad distinta de la declarada y un Brand Kit ajeno", async () => {
    const t = makeBackend();
    const brandA = await createBrand(t, USER_A, "marca-a");
    const brandB = await createBrand(t, USER_B, "marca-b");

    await expect(
      t.withIdentity({ subject: USER_B }).mutation(api.contextDocuments.create, createArgs(brandA)),
    ).rejects.toThrow("Forbidden");
    await expect(
      t.withIdentity({ subject: USER_A }).mutation(api.contextDocuments.create, createArgs(brandB)),
    ).rejects.toThrow("Forbidden");
  });

  it("aplica en servidor los límites de título, contenido y nombre de archivo", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });

    await expect(
      authed.mutation(api.contextDocuments.create, {
        ...createArgs(brandId),
        title: " ",
      }),
    ).rejects.toThrow("title_required");
    await expect(
      authed.mutation(api.contextDocuments.create, {
        ...createArgs(brandId),
        title: "x".repeat(101),
      }),
    ).rejects.toThrow("title_too_long");
    await expect(
      authed.mutation(api.contextDocuments.create, {
        ...createArgs(brandId),
        content: " \n\t",
      }),
    ).rejects.toThrow("content_required");
    await expect(
      authed.mutation(api.contextDocuments.create, {
        ...createArgs(brandId),
        content: "x".repeat(12_001),
      }),
    ).rejects.toThrow("content_too_long");
    await expect(
      authed.mutation(api.contextDocuments.create, {
        ...createArgs(brandId),
        source_filename: "x".repeat(256),
      }),
    ).rejects.toThrow("source_filename_too_long");
  });

  it("rechaza el documento número 21", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });

    for (let index = 0; index < 20; index += 1) {
      await authed.mutation(api.contextDocuments.create, createArgs(brandId, `Documento ${index}`));
    }

    await expect(
      authed.mutation(api.contextDocuments.create, createArgs(brandId, "Documento 21")),
    ).rejects.toThrow("context_document_limit_reached");
  });

  it("mantiene un único activo al activar documentos sucesivamente", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });
    const firstId = await authed.mutation(api.contextDocuments.create, createArgs(brandId, "Primero"));
    const secondId = await authed.mutation(api.contextDocuments.create, createArgs(brandId, "Segundo"));

    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: brandId,
      document_id: firstId,
    });
    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: brandId,
      document_id: secondId,
    });

    const active = await authed.query(api.contextDocuments.getActiveForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
    });
    const metadata = await authed.query(api.contextDocuments.listMetadataForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
    });
    expect(active?._id).toBe(secondId);
    expect(metadata.filter((document) => document.is_active)).toHaveLength(1);
  });

  it("serializa dos activaciones concurrentes dejando un único estado final", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });
    const firstId = await authed.mutation(api.contextDocuments.create, createArgs(brandId, "Primero"));
    const secondId = await authed.mutation(api.contextDocuments.create, createArgs(brandId, "Segundo"));

    await Promise.all([
      authed.mutation(api.contextDocuments.activate, {
        clerk_user_id: USER_A,
        brand_id: brandId,
        document_id: firstId,
      }),
      authed.mutation(api.contextDocuments.activate, {
        clerk_user_id: USER_A,
        brand_id: brandId,
        document_id: secondId,
      }),
    ]);

    const metadata = await authed.query(api.contextDocuments.listMetadataForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
    });
    expect(metadata.filter((document) => document.is_active)).toHaveLength(1);
  });

  it("resuelve activar frente a borrar sin dejar referencias activas inválidas", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });
    const documentId = await authed.mutation(api.contextDocuments.create, createArgs(brandId));

    await Promise.allSettled([
      authed.mutation(api.contextDocuments.activate, {
        clerk_user_id: USER_A,
        brand_id: brandId,
        document_id: documentId,
      }),
      authed.mutation(api.contextDocuments.remove, {
        clerk_user_id: USER_A,
        brand_id: brandId,
        document_id: documentId,
      }),
    ]);

    const metadata = await authed.query(api.contextDocuments.listMetadataForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
    });
    expect(metadata.filter((document) => document.is_active).length).toBeLessThanOrEqual(1);
  });

  it("una desactivación obsoleta no desactiva el documento actualmente activo", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });
    const firstId = await authed.mutation(api.contextDocuments.create, createArgs(brandId, "Primero"));
    const secondId = await authed.mutation(api.contextDocuments.create, createArgs(brandId, "Segundo"));

    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: brandId,
      document_id: firstId,
    });
    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: brandId,
      document_id: secondId,
    });
    await authed.mutation(api.contextDocuments.deactivate, {
      clerk_user_id: USER_A,
      brand_id: brandId,
      document_id: firstId,
    });

    const active = await authed.query(api.contextDocuments.getActiveForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
    });
    expect(active?._id).toBe(secondId);
  });

  it("lista metadatos sin cargar content", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });
    await authed.mutation(api.contextDocuments.create, createArgs(brandId));

    const metadata = await authed.query(api.contextDocuments.listMetadataForBrand, {
      clerk_user_id: USER_A,
      brand_id: brandId,
    });

    expect(metadata).toHaveLength(1);
    expect(metadata[0]).not.toHaveProperty("content");
  });

  it("detecta datos corruptos con múltiples documentos activos", async () => {
    const t = makeBackend();
    const brandId = await createBrand(t, USER_A, "marca-a");
    const authed = t.withIdentity({ subject: USER_A });

    await t.run(async (ctx) => {
      for (const title of ["Primero", "Segundo"]) {
        await ctx.db.insert("brand_context_documents", {
          brand_id: brandId,
          title,
          content: title,
          character_count: title.length,
          is_active: true,
          created_at: "2026-08-13T00:00:00.000Z",
        });
      }
    });

    await expect(
      authed.query(api.contextDocuments.getActiveForBrand, {
        clerk_user_id: USER_A,
        brand_id: brandId,
      }),
    ).rejects.toThrow("multiple_active_context_documents");
  });

  it("clona como máximo 20 documentos, conserva un único activo y verifica ambos propietarios", async () => {
    const t = makeBackend();
    const sourceBrandId = await createBrand(t, USER_A, "origen");
    const targetBrandId = await createBrand(t, USER_A, "destino");
    const foreignBrandId = await createBrand(t, USER_B, "ajena");
    const authed = t.withIdentity({ subject: USER_A });
    const firstId = await authed.mutation(api.contextDocuments.create, createArgs(sourceBrandId, "Primero"));
    await authed.mutation(api.contextDocuments.create, createArgs(sourceBrandId, "Segundo"));
    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: sourceBrandId,
      document_id: firstId,
    });

    const clonedIds = await authed.mutation(api.contextDocuments.cloneForBrand, {
      clerk_user_id: USER_A,
      source_brand_id: sourceBrandId,
      target_brand_id: targetBrandId,
    });
    const clones = await authed.query(api.contextDocuments.listMetadataForBrand, {
      clerk_user_id: USER_A,
      brand_id: targetBrandId,
    });

    expect(clonedIds).toHaveLength(2);
    expect(clones).toHaveLength(2);
    expect(clones.filter((document) => document.is_active)).toHaveLength(1);
    expect(clones.find((document) => document.is_active)?.title).toBe("Primero");

    await expect(
      authed.mutation(api.contextDocuments.cloneForBrand, {
        clerk_user_id: USER_A,
        source_brand_id: sourceBrandId,
        target_brand_id: foreignBrandId,
      }),
    ).rejects.toThrow("Forbidden");
    await expect(
      authed.mutation(api.contextDocuments.cloneForBrand, {
        clerk_user_id: USER_A,
        source_brand_id: foreignBrandId,
        target_brand_id: targetBrandId,
      }),
    ).rejects.toThrow("Forbidden");
  });

  it("al clonar sobre un destino con activo conserva un único activo total", async () => {
    const t = makeBackend();
    const sourceBrandId = await createBrand(t, USER_A, "origen");
    const targetBrandId = await createBrand(t, USER_A, "destino");
    const authed = t.withIdentity({ subject: USER_A });
    const sourceDocumentId = await authed.mutation(
      api.contextDocuments.create,
      createArgs(sourceBrandId, "Activo de origen"),
    );
    const targetDocumentId = await authed.mutation(
      api.contextDocuments.create,
      createArgs(targetBrandId, "Activo de destino"),
    );
    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: sourceBrandId,
      document_id: sourceDocumentId,
    });
    await authed.mutation(api.contextDocuments.activate, {
      clerk_user_id: USER_A,
      brand_id: targetBrandId,
      document_id: targetDocumentId,
    });

    await authed.mutation(api.contextDocuments.cloneForBrand, {
      clerk_user_id: USER_A,
      source_brand_id: sourceBrandId,
      target_brand_id: targetBrandId,
    });

    const targetDocuments = await authed.query(api.contextDocuments.listMetadataForBrand, {
      clerk_user_id: USER_A,
      brand_id: targetBrandId,
    });
    expect(targetDocuments.filter((document) => document.is_active)).toHaveLength(1);
    expect(targetDocuments.find((document) => document.is_active)?.title).toBe("Activo de origen");
  });
});
