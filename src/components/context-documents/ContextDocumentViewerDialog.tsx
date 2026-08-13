'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Id } from '@/../convex/_generated/dataModel'
import { getContextDocument } from '@/app/actions/context-documents'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from '@/components/ui/spinner'

interface ContextDocumentViewerDialogProps {
    brandId: string
    documentId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

type LoadedDocument = {
    title: string
    content: string
    sourceFilename?: string
    characterCount: number
}

export function ContextDocumentViewerDialog({
    brandId,
    documentId,
    open,
    onOpenChange,
}: ContextDocumentViewerDialogProps) {
    const { t } = useTranslation('brandKit')
    const [loadState, setLoadState] = useState<{
        key: string | null
        document: LoadedDocument | null
        error: string | null
    }>({ key: null, document: null, error: null })
    const requestKey = open && documentId ? `${brandId}:${documentId}` : null
    const isLoading = requestKey !== null && loadState.key !== requestKey
    const document = loadState.key === requestKey ? loadState.document : null
    const error = loadState.key === requestKey ? loadState.error : null

    useEffect(() => {
        if (!open || !documentId) return
        let cancelled = false
        void getContextDocument(
            brandId as Id<'brand_dna'>,
            documentId as Id<'brand_context_documents'>,
        ).then((result) => {
            if (cancelled) return
            setLoadState({
                key: `${brandId}:${documentId}`,
                document: result.success ? result.document : null,
                error: result.success ? null : result.error,
            })
        })
        return () => { cancelled = true }
    }, [brandId, documentId, open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{document?.title || t('contextDocuments.viewerTitle')}</DialogTitle>
                    <DialogDescription>
                        {document?.sourceFilename || t('contextDocuments.viewerDescription')}
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex min-h-48 items-center justify-center" role="status">
                        <Loader2 className="h-5 w-5" title={t('contextDocuments.loading')} />
                    </div>
                ) : error ? (
                    <p className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive" role="alert">
                        {error}
                    </p>
                ) : document ? (
                    <ScrollArea className="max-h-[55vh] rounded-xl border border-border/70 p-4">
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{document.content}</pre>
                    </ScrollArea>
                ) : null}
                <DialogFooter className="items-center sm:justify-between">
                    <span className="text-sm text-muted-foreground">
                        {document ? t('contextDocuments.characterCount', { count: document.characterCount }) : ''}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" disabled title={t('contextDocuments.comingSoon')}>
                            {t('contextDocuments.analyzeFuture')}
                        </Button>
                        <Button variant="secondary" onClick={() => onOpenChange(false)}>
                            {t('contextDocuments.close')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
