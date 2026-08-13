'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useBrandContextDocuments } from '@/hooks/useBrandContextDocuments'
import { ContextDocumentSelectorDialog } from './ContextDocumentSelectorDialog'

interface ContextDocumentAnalysisControlProps {
    brandId?: string | null
    onContextChanged?: (documentId: string | null) => void
}

export function ContextDocumentAnalysisControl({
    brandId,
    onContextChanged,
}: ContextDocumentAnalysisControlProps) {
    const { t } = useTranslation('image')
    const [open, setOpen] = useState(false)
    const context = useBrandContextDocuments(brandId)
    const active = context.activeDocument
    const label = !brandId
        ? t('contextDocuments.noBrandKit')
        : active
            ? t('contextDocuments.activeLabel', { title: active.title })
            : t('contextDocuments.inactiveLabel')

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative h-8 w-8 rounded-full transition-all"
                        disabled={!brandId}
                        onClick={() => setOpen(true)}
                        aria-label={label}
                    >
                        <FileText className={cn('h-4 w-4', active ? 'text-foreground' : 'text-muted-foreground')} />
                        <span
                            className={cn(
                                'absolute right-1 top-1 h-1.5 w-1.5 rounded-full border border-background',
                                active ? 'bg-primary' : 'bg-muted-foreground/40',
                            )}
                            aria-hidden="true"
                        />
                        <span className="sr-only">
                            {active ? t('contextDocuments.activeStatus') : t('contextDocuments.inactiveStatus')}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
            {brandId ? (
                <ContextDocumentSelectorDialog
                    brandId={brandId}
                    open={open}
                    onOpenChange={setOpen}
                    onContextChanged={onContextChanged}
                />
            ) : null}
        </>
    )
}
