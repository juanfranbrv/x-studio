'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import type { ContextDocumentMetadata } from '@/lib/context-documents'
import {
    activateContextDocument,
    createContextDocument,
    deactivateContextDocument,
    deleteContextDocument,
} from '@/app/actions/context-documents'

type MutationResult = { success: true; id?: string } | { success: false; error: string }

export function useBrandContextDocuments(brandId?: string | null) {
    const { user, isLoaded: isUserLoaded } = useUser()
    const [pendingAction, setPendingAction] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const queryArgs = user?.id && brandId
        ? { clerk_user_id: user.id, brand_id: brandId as Id<'brand_dna'> }
        : 'skip'
    const rows = useQuery(api.contextDocuments.listMetadataForBrand, queryArgs)

    const documents = useMemo<ContextDocumentMetadata[]>(() => (
        (rows || [])
            .map((document) => ({
                id: String(document._id),
                brandId: String(document.brand_id),
                title: document.title,
                sourceFilename: document.source_filename,
                characterCount: document.character_count,
                isActive: document.is_active,
                createdAt: document.created_at,
            }))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    ), [rows])

    const execute = useCallback(async (key: string, operation: () => Promise<MutationResult>) => {
        if (pendingAction) return { success: false as const, error: 'Hay otra operación en curso.' }
        setPendingAction(key)
        setError(null)
        try {
            const result = await operation()
            if (!result.success) setError(result.error)
            return result
        } finally {
            setPendingAction(null)
        }
    }, [pendingAction])

    const create = useCallback((input: { title: string; content: string; sourceFilename?: string }) => {
        if (!brandId) return Promise.resolve({ success: false as const, error: 'Selecciona un Brand Kit.' })
        return execute('create', () => createContextDocument({
            brandId: brandId as Id<'brand_dna'>,
            ...input,
        }))
    }, [brandId, execute])

    const activate = useCallback((documentId: string) => {
        if (!brandId) return Promise.resolve({ success: false as const, error: 'Selecciona un Brand Kit.' })
        return execute(documentId, () => activateContextDocument(
            brandId as Id<'brand_dna'>,
            documentId as Id<'brand_context_documents'>,
        ))
    }, [brandId, execute])

    const deactivate = useCallback((documentId: string) => {
        if (!brandId) return Promise.resolve({ success: false as const, error: 'Selecciona un Brand Kit.' })
        return execute(documentId, () => deactivateContextDocument(
            brandId as Id<'brand_dna'>,
            documentId as Id<'brand_context_documents'>,
        ))
    }, [brandId, execute])

    const remove = useCallback((documentId: string) => {
        if (!brandId) return Promise.resolve({ success: false as const, error: 'Selecciona un Brand Kit.' })
        return execute(documentId, () => deleteContextDocument(
            brandId as Id<'brand_dna'>,
            documentId as Id<'brand_context_documents'>,
        ))
    }, [brandId, execute])

    return {
        documents,
        activeDocument: documents.find((document) => document.isActive) ?? null,
        isLoading: !isUserLoaded || (!!user?.id && !!brandId && rows === undefined),
        pendingAction,
        error,
        clearError: () => setError(null),
        create,
        activate,
        deactivate,
        remove,
    }
}
