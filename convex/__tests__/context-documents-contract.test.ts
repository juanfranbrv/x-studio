import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../..");
const schemaPath = resolve(projectRoot, "convex/schema.ts");
const modulePath = resolve(projectRoot, "convex/contextDocuments.ts");
const brandsPath = resolve(projectRoot, "convex/brands.ts");
const apiTypesPath = resolve(projectRoot, "convex/_generated/api.d.ts");
const serverActionPath = resolve(projectRoot, "src/app/actions/context-documents.ts");
const brandKitPagePath = resolve(projectRoot, "src/app/brand-kit/page.tsx");

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

describe("contrato estático de documentos de contexto", () => {
  const schemaSource = read(schemaPath);
  const moduleSource = read(modulePath);
  const brandsSource = read(brandsPath);
  const apiTypesSource = read(apiTypesPath);
  const serverActionSource = read(serverActionPath);
  const brandKitPageSource = read(brandKitPagePath);

  it("declara la tabla y sus índices", () => {
    expect(schemaSource).toContain("brand_context_documents: defineTable({");
    expect(schemaSource).toContain('.index("by_brand", ["brand_id"])');
    expect(schemaSource).toContain('.index("by_brand_active", ["brand_id", "is_active"])');
  });

  it("expone todas las operaciones públicas con autorización y validadores", () => {
    expect(moduleSource).not.toBe("");
    for (const functionName of [
      "listMetadataForBrand",
      "getForBrand",
      "getActiveForBrand",
      "create",
      "activate",
      "deactivate",
      "remove",
      "cloneForBrand",
    ]) {
      expect(moduleSource).toMatch(new RegExp(`export const ${functionName} = (?:query|mutation)\\(\\{`));
    }
    expect(moduleSource).toContain("requireSameUser");
    expect(moduleSource).toContain("clerk_user_id");
    expect(moduleSource).toContain("brand.clerk_user_id");
    expect(moduleSource.match(/args:\s*\{/g)?.length).toBeGreaterThanOrEqual(8);
    expect(moduleSource.match(/returns:/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("mantiene cuota, metadatos ligeros y exclusividad del activo", () => {
    expect(moduleSource).toContain("MAX_PER_BRAND = 20");
    const metadataQuery = moduleSource.slice(
      moduleSource.indexOf("export const listMetadataForBrand"),
      moduleSource.indexOf("export const getForBrand"),
    );
    expect(metadataQuery).not.toMatch(/\bcontent\s*:/);
    expect(moduleSource).toMatch(/getActiveForBrand[\s\S]*?activeRows\.length\s*>\s*1/);
    expect(moduleSource).toMatch(/activate[\s\S]*?by_brand_active[\s\S]*?for \(const active/);
  });

  it("registra el módulo en los tipos locales de la API", () => {
    expect(apiTypesSource).toContain('import type * as contextDocuments from "../contextDocuments.js";');
    expect(apiTypesSource).toContain("contextDocuments: typeof contextDocuments;");
  });

  it("elimina los documentos del kit antes de eliminar el Brand Kit", () => {
    const deleteMutation = brandsSource.match(
      /export const deleteBrandDNA = mutation\(\{[\s\S]*?\n\}\);/,
    )?.[0] ?? "";

    expect(deleteMutation).toContain('query("brand_context_documents")');
    expect(deleteMutation).toContain('.withIndex("by_brand"');
    expect(deleteMutation).toMatch(/for \(const document of contextDocuments\)/);
    expect(deleteMutation.indexOf("ctx.db.delete(document._id)")).toBeLessThan(
      deleteMutation.indexOf("ctx.db.delete(args.id)"),
    );
  });

  it("clona documentos en la clonación administrativa con cuota y un solo activo", () => {
    const cloneMutation = brandsSource.match(
      /export const cloneBrandDNAToUser = mutation\(\{[\s\S]*?\n\}\);/,
    )?.[0] ?? "";

    expect(cloneMutation).toContain('query("brand_context_documents")');
    expect(cloneMutation).toContain('.withIndex("by_brand"');
    expect(cloneMutation).toContain(".take(MAX_CONTEXT_DOCUMENTS_PER_BRAND)");
    expect(cloneMutation).toContain('ctx.db.insert("brand_context_documents"');
    expect(cloneMutation).toContain("source_filename");
    expect(cloneMutation).toContain("character_count");
    expect(cloneMutation).toContain("created_at: document.created_at");
  });

  it("duplica Brand Kit y documentos en una única mutación autenticada", () => {
    const duplicateMutation = brandsSource.match(
      /export const duplicateBrandDNAWithContext = mutation\(\{[\s\S]*?\n\}\);/,
    )?.[0] ?? "";

    expect(duplicateMutation).toContain('source_id: v.id("brand_dna")');
    expect(duplicateMutation).toContain("clerk_user_id: v.string()");
    expect(duplicateMutation).toContain("brand_name: v.string()");
    expect(duplicateMutation).toContain('returns: v.id("brand_dna")');
    expect(duplicateMutation).toContain("requireSameUser(ctx, args.clerk_user_id)");
    expect(duplicateMutation).toContain("source.clerk_user_id !== args.clerk_user_id");
    expect(duplicateMutation).toContain('ctx.db.insert("brand_dna"');
    expect(duplicateMutation).toContain('query("brand_context_documents")');
    expect(duplicateMutation).toContain('ctx.db.insert("brand_context_documents"');
    expect(duplicateMutation).toContain(".take(MAX_CONTEXT_DOCUMENTS_PER_BRAND)");
  });

  it("expone una Server Action autenticada sin aceptar un clerk ID del cliente", () => {
    expect(serverActionSource).toContain("'use server'");
    expect(serverActionSource).toContain("await auth()");
    expect(serverActionSource).toContain("if (!userId)");
    expect(serverActionSource).toContain("authedFetchMutation(api.contextDocuments.cloneForBrand");
    expect(serverActionSource).toMatch(
      /cloneContextDocumentsForBrand\(\s*sourceBrandId:\s*Id<['\"]brand_dna['\"]>,\s*targetBrandId:\s*Id<['\"]brand_dna['\"]>/,
    );
    expect(serverActionSource).toContain("clerk_user_id: userId");
    expect(serverActionSource).not.toMatch(/cloneContextDocumentsForBrand\([^)]*clerk/i);
    expect(serverActionSource.indexOf("await auth()")).toBeLessThan(
      serverActionSource.indexOf("authedFetchMutation(api.contextDocuments.cloneForBrand"),
    );
    expect(serverActionSource).toContain("log.error('BRAND'");
    expect(serverActionSource).not.toContain("error instanceof Error");
    expect(serverActionSource).not.toContain("error.message");
  });

  it("expone duplicación atómica autenticada y devuelve solo un error público estable", () => {
    const duplicateAction = serverActionSource.match(
      /export async function duplicateBrandKitWithContext\([\s\S]*?\n\}/,
    )?.[0] ?? "";

    expect(duplicateAction).toMatch(
      /duplicateBrandKitWithContext\(\s*sourceBrandId:\s*Id<['\"]brand_dna['\"]>,\s*newName:\s*string/,
    );
    expect(duplicateAction).toContain("await auth()");
    expect(duplicateAction).toContain("api.brands.duplicateBrandDNAWithContext");
    expect(duplicateAction).toContain("clerk_user_id: userId");
    expect(duplicateAction).toContain("error: DUPLICATE_BRAND_KIT_ERROR");
    expect(duplicateAction).not.toMatch(/duplicateBrandKitWithContext\([^)]*clerk/i);
    expect(duplicateAction.indexOf("await auth()")).toBeLessThan(
      duplicateAction.indexOf("authedFetchMutation(api.brands.duplicateBrandDNAWithContext"),
    );
  });

  it("cablea la duplicación real a una única Server Action transaccional", () => {
    expect(brandKitPageSource).toContain(
      "import { duplicateBrandKitWithContext } from '@/app/actions/context-documents';",
    );
    const duplicateFlow = brandKitPageSource.match(
      /const handleDuplicateCurrentBrandKit = async \(\) => \{[\s\S]*?\n    \};/,
    )?.[0] ?? "";
    const duplicateIndex = duplicateFlow.indexOf("await duplicateBrandKitWithContext");
    const reloadIndex = duplicateFlow.indexOf("await reloadBrandKits");
    const successToastIndex = duplicateFlow.indexOf("title: t('toasts.duplicatedTitle')");

    expect(duplicateIndex).toBeGreaterThan(-1);
    expect(duplicateFlow).toMatch(/if \(!duplicateResult\.success\)\s*\{\s*throw new Error/);
    expect(duplicateFlow).not.toContain("/api/brand-kit/create-empty");
    expect(duplicateFlow).not.toContain("updateUserBrandKit");
    expect(duplicateFlow).not.toContain("cloneContextDocumentsForBrand");
    expect(reloadIndex).toBeGreaterThan(duplicateIndex);
    expect(successToastIndex).toBeGreaterThan(duplicateIndex);
    expect(duplicateFlow).not.toContain("deleteBrandKitById(createdId)");
    expect(duplicateFlow).not.toMatch(
      /(?:deleteBrandKitById|deleteBrandDNA|deleteUserBrandKit)\s*\(\s*createdId/,
    );
  });
});
