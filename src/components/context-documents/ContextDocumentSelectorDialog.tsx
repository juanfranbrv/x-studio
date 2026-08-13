'use client'

import { useState } from 'react'
import { Check, Eye, FileText, PowerOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useBrandContextDocuments } from '@/hooks/useBrandContextDocuments'
import { ContextDocumentViewerDialog } from './ContextDocumentViewerDialog'

interface ContextDocumentSelectorDialogProps {
    brandId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onContextChanged?: (documentId: string | null) => void
}

export function ContextDocumentSelectorDialog({
    brandId,
    open,
    onOpenChange,
    onContextChanged,
}: ContextDocumentSelectorDialogProps) {
    const { t } = useTranslation('image')
    const context = useBrandContextDocuments(brandId)
    const [viewerDocumentId, setViewerDocumentId] = useState<string | null>(null)

    const changeActive = async (documentId: string, isActive: boolean) => {
        const result = isActive
            ? await context.deactivate(documentId)
            : await context.activate(documentId)
        if (result.success) onContextChanged?.(isActive ? null : documentId)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('contextDocuments.selectorTitle')}</DialogTitle>
                        <DialogDescription>{t('contextDocuments.selectorDescription')}</DialogDescription>
                    </DialogHeader>
                    {context.error ? (
                        <p className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive" role="alert">
                            {context.error}
                        </p>
                    ) : null}
                    {context.isLoading ? (
                        <div className="flex min-h-32 items-center justify-center" role="status">
                            <Loader2 className="h-5 w-5" title={t('contextDocuments.loading')} />
                        </div>
                    ) : context.documents.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t('contextDocuments.emptySelector')}
                        </p>
                    ) : (
                        <ScrollArea className="max-h-[55vh] pr-3">
                            <div className="space-y-2">
                                {context.documents.map((document) => {
                                    const isPending = context.pendingAction === document.id
                                    return (
                                        <div
                                            key={document.id}
                                            className={cn(
                                                'flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-all',
                                                document.isActive && 'border-primary/40 bg-primary/5',
                                            )}
                                        >
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{document.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {document.isActive
                                                        ? t('contextDocuments.activeStatus')
                                                        : t('contextDocuments.inactiveStatus')}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={Boolean(context.pendingAction)}
                                                onClick={() => setViewerDocumentId(document.id)}
                                                aria-label={t('contextDocuments.viewDocument', { title: document.title })}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={document.isActive ? 'secondary' : 'outline'}
                                                disabled={Boolean(context.pendingAction)}
                                                onClick={() => void changeActive(document.id, document.isActive)}
                                            >
                                                {isPending ? <Loader2 className="mr-2 h-4 w-4" /> : document.isActive
                                                    ? <PowerOff className="mr-2 h-4 w-4" />
                                                    : <Check className="mr-2 h-4 w-4" />}
                                                {document.isActive
                                                    ? t('contextDocuments.stopUsing')
                                                    : t('contextDocuments.useDocument')}
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
            <ContextDocumentViewerDialog
                brandId={brandId}
                documentId={viewerDocumentId}
                open={viewerDocumentId !== null}
                onOpenChange={(viewerOpen) => { if (!viewerOpen) setViewerDocumentId(null) }}
            />
        </>
    )
}
