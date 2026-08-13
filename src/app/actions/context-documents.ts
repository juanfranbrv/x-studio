'use server';

import { auth } from '@clerk/nextjs/server';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { authedFetchMutation, authedFetchQuery } from '@/lib/convex-server';
import { log } from '@/lib/logger';

const UNAUTHORIZED_ERROR = 'No autorizado';
const CLONE_CONTEXT_DOCUMENTS_ERROR = 'No se pudieron copiar los documentos de contexto.';
const DUPLICATE_BRAND_KIT_ERROR = 'No se pudo duplicar el Brand Kit.';
const CONTEXT_DOCUMENT_ACTION_ERROR = 'No se pudo completar la operación con el documento de contexto.';

export async function createContextDocument(input: {
    brandId: Id<'brand_dna'>;
    title: string;
    content: string;
    sourceFilename?: string;
}) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false as const, error: UNAUTHORIZED_ERROR };
        const id = await authedFetchMutation(api.contextDocuments.create, {
            clerk_user_id: userId,
            brand_id: input.brandId,
            title: input.title,
            content: input.content,
            source_filename: input.sourceFilename,
        });
        return { success: true as const, id: String(id) };
    } catch (error: unknown) {
        log.error('BRAND', 'Error al crear documento de contexto', error);
        return { success: false as const, error: CONTEXT_DOCUMENT_ACTION_ERROR };
    }
}

export async function getContextDocument(brandId: Id<'brand_dna'>, documentId: Id<'brand_context_documents'>) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false as const, error: UNAUTHORIZED_ERROR };
        const document = await authedFetchQuery(api.contextDocuments.getForBrand, {
            clerk_user_id: userId,
            brand_id: brandId,
            document_id: documentId,
        });
        if (!document) return { success: false as const, error: 'El documento ya no está disponible.' };
        return {
            success: true as const,
            document: {
                id: String(document._id),
                brandId: String(document.brand_id),
                title: document.title,
                content: document.content,
                sourceFilename: document.source_filename,
                characterCount: document.character_count,
                isActive: document.is_active,
                createdAt: document.created_at,
            },
        };
    } catch (error: unknown) {
        log.error('BRAND', 'Error al leer documento de contexto', error);
        return { success: false as const, error: CONTEXT_DOCUMENT_ACTION_ERROR };
    }
}

async function mutateContextDocument(
    operation: typeof api.contextDocuments.activate | typeof api.contextDocuments.deactivate | typeof api.contextDocuments.remove,
    brandId: Id<'brand_dna'>,
    documentId: Id<'brand_context_documents'>,
) {
    const { userId } = await auth();
    if (!userId) return { success: false as const, error: UNAUTHORIZED_ERROR };
    await authedFetchMutation(operation, {
        clerk_user_id: userId,
        brand_id: brandId,
        document_id: documentId,
    });
    return { success: true as const };
}

export async function activateContextDocument(brandId: Id<'brand_dna'>, documentId: Id<'brand_context_documents'>) {
    try {
        return await mutateContextDocument(api.contextDocuments.activate, brandId, documentId);
    } catch (error: unknown) {
        log.error('BRAND', 'Error al activar documento de contexto', error);
        return { success: false as const, error: CONTEXT_DOCUMENT_ACTION_ERROR };
    }
}

export async function deactivateContextDocument(brandId: Id<'brand_dna'>, documentId: Id<'brand_context_documents'>) {
    try {
        return await mutateContextDocument(api.contextDocuments.deactivate, brandId, documentId);
    } catch (error: unknown) {
        log.error('BRAND', 'Error al desactivar documento de contexto', error);
        return { success: false as const, error: CONTEXT_DOCUMENT_ACTION_ERROR };
    }
}

export async function deleteContextDocument(brandId: Id<'brand_dna'>, documentId: Id<'brand_context_documents'>) {
    try {
        return await mutateContextDocument(api.contextDocuments.remove, brandId, documentId);
    } catch (error: unknown) {
        log.error('BRAND', 'Error al eliminar documento de contexto', error);
        return { success: false as const, error: CONTEXT_DOCUMENT_ACTION_ERROR };
    }
}

export async function cloneContextDocumentsForBrand(
    sourceBrandId: Id<'brand_dna'>,
    targetBrandId: Id<'brand_dna'>,
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false as const, error: UNAUTHORIZED_ERROR };
        }

        const clonedIds = await authedFetchMutation(api.contextDocuments.cloneForBrand, {
            clerk_user_id: userId,
            source_brand_id: sourceBrandId,
            target_brand_id: targetBrandId,
        });
        return { success: true as const, clonedCount: clonedIds.length };
    } catch (error: unknown) {
        log.error('BRAND', 'Error al clonar documentos de contexto', error);
        return { success: false as const, error: CLONE_CONTEXT_DOCUMENTS_ERROR };
    }
}

export async function duplicateBrandKitWithContext(
    sourceBrandId: Id<'brand_dna'>,
    newName: string,
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false as const, error: UNAUTHORIZED_ERROR };
        }

        const brandId = await authedFetchMutation(api.brands.duplicateBrandDNAWithContext, {
            source_id: sourceBrandId,
            clerk_user_id: userId,
            brand_name: newName,
        });
        return { success: true as const, id: brandId };
    } catch (error: unknown) {
        log.error('BRAND', 'Error al duplicar Brand Kit con documentos', error);
        return { success: false as const, error: DUPLICATE_BRAND_KIT_ERROR };
    }
}
