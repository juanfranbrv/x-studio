'use client'

import { useRef, useState } from 'react'
import { Check, Eye, FileText, Plus, PowerOff, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import {
    CONTEXT_DOCUMENT_MAX_CHARACTERS,
    CONTEXT_DOCUMENT_MAX_PER_BRAND,
    countContextCharacters,
    readContextTextFile,
    validateContextDocument,
} from '@/lib/context-documents'
import { useBrandContextDocuments } from '@/hooks/useBrandContextDocuments'
import { ContextDocumentViewerDialog } from './ContextDocumentViewerDialog'
import {
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
} from '@/components/brand-dna/brandKitStyles'

interface ContextDocumentsManagerProps {
    brandId: string
}

export function ContextDocumentsManager({ brandId }: ContextDocumentsManagerProps) {
    const { t } = useTranslation('brandKit')
    const context = useBrandContextDocuments(brandId)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [editorOpen, setEditorOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [sourceFilename, setSourceFilename] = useState<string | undefined>()
    const [editorError, setEditorError] = useState<string | null>(null)
    const [viewerDocumentId, setViewerDocumentId] = useState<string | null>(null)
    const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
    const characterCount = countContextCharacters(content)
    const quotaReached = context.documents.length >= CONTEXT_DOCUMENT_MAX_PER_BRAND

    const resetEditor = () => {
        setTitle('')
        setContent('')
        setSourceFilename(undefined)
        setEditorError(null)
    }

    const openEditor = () => {
        resetEditor()
        setEditorOpen(true)
    }

    const handleFile = async (file?: File) => {
        if (!file) return
        try {
            const parsed = await readContextTextFile(file)
            setTitle(parsed.title)
            setContent(parsed.content)
            setSourceFilename(parsed.sourceFilename)
            setEditorError(null)
            setEditorOpen(true)
        } catch {
            setEditorError(t('contextDocuments.invalidFile'))
            setEditorOpen(true)
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleCreate = async () => {
        const validation = validateContextDocument({ title, content, sourceFilename })
        if (!validation.ok) {
            setEditorError(t(`contextDocuments.validation.${validation.error}`))
            return
        }
        const result = await context.create({ title, content, sourceFilename })
        if (result.success) {
            setEditorOpen(false)
            resetEditor()
        } else {
            setEditorError(result.error)
        }
    }

    const changeActive = async (documentId: string, isActive: boolean) => {
        if (isActive) await context.deactivate(documentId)
        else await context.activate(documentId)
    }

    const confirmDelete = async () => {
        if (!deleteDocumentId) return
        const result = await context.remove(deleteDocumentId)
        if (result.success) setDeleteDocumentId(null)
    }

    return (
        <>
            <Card className={cn(BRAND_KIT_PANEL_CLASS, 'overflow-hidden')}>
                <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, 'pb-4')}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                                <FileText />
                                {t('contextDocuments.title')}
                            </CardTitle>
                            <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                                {t('contextDocuments.description')}
                            </p>
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">
                            {context.documents.length}/{CONTEXT_DOCUMENT_MAX_PER_BRAND}
                        </span>
                    </div>
                </CardHeader>
                <div className="space-y-4 px-6 pb-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md,.txt,text/plain,text/markdown"
                        className="hidden"
                        onChange={(event) => void handleFile(event.target.files?.[0])}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" disabled={quotaReached} onClick={openEditor}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('contextDocuments.addManual')}
                        </Button>
                        <Button variant="outline" disabled={quotaReached} onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            {t('contextDocuments.importFile')}
                        </Button>
                    </div>
                    {context.error ? (
                        <p className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive" role="alert">
                            {context.error}
                        </p>
                    ) : null}
                    {quotaReached ? (
                        <p className="text-sm text-muted-foreground">{t('contextDocuments.quotaReached')}</p>
                    ) : null}
                    {context.isLoading ? (
                        <div className="flex min-h-24 items-center justify-center" role="status">
                            <Loader2 className="h-5 w-5" title={t('contextDocuments.loading')} />
                        </div>
                    ) : context.documents.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                            {t('contextDocuments.empty')}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {context.documents.map((document) => (
                                <div
                                    key={document.id}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-all',
                                        document.isActive && 'border-primary/40 bg-primary/5',
                                    )}
                                >
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{document.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('contextDocuments.characterCount', { count: document.characterCount })}
                                            {' · '}
                                            {document.isActive
                                                ? t('contextDocuments.activeStatus')
                                                : t('contextDocuments.inactiveStatus')}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setViewerDocumentId(document.id)} aria-label={t('contextDocuments.viewDocument', { title: document.title })}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" disabled={Boolean(context.pendingAction)} onClick={() => void changeActive(document.id, document.isActive)} aria-label={document.isActive ? t('contextDocuments.stopUsing') : t('contextDocuments.useDocument')}>
                                        {context.pendingAction === document.id ? <Loader2 className="h-4 w-4" /> : document.isActive ? <PowerOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" disabled={Boolean(context.pendingAction)} onClick={() => setDeleteDocumentId(document.id)} aria-label={t('contextDocuments.deleteDocument', { title: document.title })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            <Dialog open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) resetEditor() }}>
                <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-2xl">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{t('contextDocuments.editorTitle')}</DialogTitle>
                        <DialogDescription>{t('contextDocuments.editorDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1">
                        <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder={t('contextDocuments.titlePlaceholder')} />
                        <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="field-sizing-fixed h-72 min-h-40 max-h-[50dvh] resize-y" placeholder={t('contextDocuments.contentPlaceholder')} />
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{sourceFilename || t('contextDocuments.manualSource')}</span>
                            <span className={cn(characterCount > CONTEXT_DOCUMENT_MAX_CHARACTERS ? 'text-destructive' : 'text-muted-foreground')}>
                                {characterCount}/{CONTEXT_DOCUMENT_MAX_CHARACTERS}
                            </span>
                        </div>
                        {editorError ? <p className="text-sm text-destructive" role="alert">{editorError}</p> : null}
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button variant="outline" onClick={() => setEditorOpen(false)}>{t('contextDocuments.cancel')}</Button>
                        <Button disabled={context.pendingAction === 'create'} onClick={() => void handleCreate()}>
                            {context.pendingAction === 'create' ? <Loader2 className="mr-2 h-4 w-4" /> : null}
                            {t('contextDocuments.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ContextDocumentViewerDialog
                brandId={brandId}
                documentId={viewerDocumentId}
                open={viewerDocumentId !== null}
                onOpenChange={(open) => { if (!open) setViewerDocumentId(null) }}
            />

            <AlertDialog open={deleteDocumentId !== null} onOpenChange={(open) => { if (!open) setDeleteDocumentId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('contextDocuments.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('contextDocuments.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    {context.error ? <p className="text-sm text-destructive" role="alert">{context.error}</p> : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('contextDocuments.cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={Boolean(context.pendingAction)} onClick={(event) => { event.preventDefault(); void confirmDelete() }}>
                            {t('contextDocuments.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
