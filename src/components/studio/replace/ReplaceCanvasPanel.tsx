'use client'

import { IconLayers } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface ReplaceCanvasPanelProps {
    selectedTemplateName: string
    resultImageUrl: string | null
    isGenerating: boolean
    generationError: string | null
}

export function ReplaceCanvasPanel({
    selectedTemplateName,
    resultImageUrl,
    isGenerating,
    generationError,
}: ReplaceCanvasPanelProps) {
    return (
        <section className="canvas-scroll-region flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto overflow-x-hidden px-4 pb-5 pt-[1.1rem]">
            <div className="flex w-full shrink-0 items-start justify-center px-2 py-3 md:px-3 md:py-4">
                <div
                    className={cn(
                        'canvas-panel relative flex min-h-[760px] w-full max-w-[1080px] shrink-0 items-center justify-center overflow-visible rounded-[1.65rem] border border-border/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] bg-dot shadow-[0_28px_64px_-42px_rgba(15,23,42,0.26)]'
                    )}
                    style={{
                        containerType: 'inline-size',
                        containerName: 'canvas',
                    }}
                >
                    {resultImageUrl ? (
                        <div className="flex h-full w-full items-center justify-center rounded-[1.45rem] border border-border/40 bg-white p-4">
                            <img
                                src={resultImageUrl}
                                alt={`Resultado Replace basado en ${selectedTemplateName}`}
                                className="h-full w-full rounded-[1.2rem] object-contain shadow-[0_28px_64px_-42px_rgba(15,23,42,0.26)]"
                            />
                        </div>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.45rem] border border-dashed border-border/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-6 text-center text-muted-foreground transition-colors">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-border/50 bg-background/92 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.42)]">
                                <IconLayers className="h-7 w-7 text-primary/80" />
                            </div>
                            <p className="text-[clamp(2rem,1.55rem+1.8vw,3.4rem)] font-semibold tracking-[-0.04em] text-foreground/92">
                                {isGenerating ? 'generando' : 'resultado'}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {isGenerating
                                    ? 'Sustituyendo el producto principal de la plantilla con tu producto...'
                                    : 'Preview experimental del módulo Replace'}
                            </p>
                            {generationError ? (
                                <div className="mt-4 max-w-[44rem] rounded-[1rem] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                    {generationError}
                                </div>
                            ) : null}
                            <div className="mt-4 rounded-full border border-border/30 bg-background/80 px-3 py-1 text-xs text-muted-foreground/90 shadow-none">
                                Plantilla activa: {selectedTemplateName}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
