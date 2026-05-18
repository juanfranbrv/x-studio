'use client'

import type { ChangeEvent } from 'react'
import { useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { IconCheck, IconImage, IconLayers, IconPalette, IconUpload } from '@/components/ui/icons'
import { STUDIO_CONTROLS_SHELL_CLASS } from '@/components/studio/shared/panelStyles'
import { SectionHeader } from '@/components/studio/shared/SectionHeader'
import { canGenerateReplaceImage } from '@/lib/replace-generation'
import { cn } from '@/lib/utils'

type ReplaceTemplate = {
    id: string
    name: string
    imageUrl: string
}

type BrandKitImageOption = {
    id: string
    url: string
    name?: string
}

interface ReplaceControlsPanelProps {
    selectedImageUrl: string | null
    selectedImageLabel: string
    templates: ReplaceTemplate[]
    selectedTemplateId: string | null
    brandKitImages: BrandKitImageOption[]
    isUploading: boolean
    isGenerating: boolean
    userRefinement: string
    onFileSelected: (file: File) => Promise<void>
    onUserRefinementChange: (value: string) => void
    onSelectBrandKitImage: (image: BrandKitImageOption) => void
    onSelectTemplate: (templateId: string) => void
    onGenerate: () => Promise<void>
}

const ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'
const PANEL_SECTION_HEADER_ICON_CLASS = 'h-9 w-9 rounded-none border-0 bg-transparent text-foreground/72 shadow-none'
const PANEL_SECTION_HEADER_TITLE_CLASS = 'text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92'
const PANEL_SECTION_STACK_CLASS = 'space-y-3'
const PANEL_SECTION_DIVIDER_CLASS = 'relative pt-5 before:absolute before:left-[-1rem] before:right-[-1rem] before:top-0 before:h-[2px] before:bg-border/35 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.04)] md:before:left-[-1.25rem] md:before:right-[-1.25rem]'

export function ReplaceControlsPanel({
    selectedImageUrl,
    selectedImageLabel,
    templates,
    selectedTemplateId,
    brandKitImages,
    isUploading,
    isGenerating,
    userRefinement,
    onFileSelected,
    onUserRefinementChange,
    onSelectBrandKitImage,
    onSelectTemplate,
    onGenerate,
}: ReplaceControlsPanelProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [brandKitDialogOpen, setBrandKitDialogOpen] = useState(false)

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
        [selectedTemplateId, templates]
    )
    const canGenerate = canGenerateReplaceImage({
        selectedProductImageUrl: selectedImageUrl,
        selectedTemplateId,
    })

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        await onFileSelected(file)
        event.target.value = ''
    }

    return (
        <>
            <aside className={cn(STUDIO_CONTROLS_SHELL_CLASS, 'w-full lg:max-w-[360px]')}>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(ACTION_BUTTON_CLASS, 'gap-2')}
                            disabled={isUploading}
                            onClick={() => inputRef.current?.click()}
                        >
                            <IconUpload className="h-3.5 w-3.5" />
                            {isUploading ? 'Subiendo...' : 'Subir contenido'}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(ACTION_BUTTON_CLASS, 'gap-2')}
                            onClick={() => setBrandKitDialogOpen(true)}
                        >
                            <IconPalette className="h-3.5 w-3.5" />
                            Desde Kit de marca
                        </Button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => { void handleFileChange(event) }}
                        />
                    </div>

                    <section className={PANEL_SECTION_STACK_CLASS}>
                        <div className="aspect-[4/3] overflow-hidden rounded-[1.2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.9))]">
                            {selectedImageUrl ? (
                                <img
                                    src={selectedImageUrl}
                                    alt={selectedImageLabel}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                                    <IconImage className="h-7 w-7 text-muted-foreground" />
                                    <p className="text-sm font-medium text-foreground/88">Imagen de producto del usuario</p>
                                    <p className="text-xs text-muted-foreground">Selecciona una referencia desde tu dispositivo o Brand Kit.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_DIVIDER_CLASS)}>
                        <div className="space-y-2">
                            <Label htmlFor="replace-user-refinement" className="text-sm font-medium text-foreground/90">
                                Prompt opcional
                            </Label>
                            <textarea
                                id="replace-user-refinement"
                                value={userRefinement}
                                onChange={(event) => onUserRefinementChange(event.target.value)}
                                placeholder="Añade un matiz extra si quieres: más premium, más dramático, fondo más limpio..."
                                className="min-h-[112px] w-full resize-y rounded-[1rem] border border-border/70 bg-background/95 px-3 py-3 text-sm text-foreground/92 outline-none transition-all placeholder:text-muted-foreground/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                            />
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Si lo dejas vacío, Replace usará solo la instrucción base configurable desde Admin.
                            </p>
                        </div>
                    </section>

                    <section className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_DIVIDER_CLASS, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
                        <SectionHeader
                            icon={IconLayers}
                            title="Plantillas"
                            iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                            titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                            className="mb-1"
                        />
                        <div className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                            {templates.map((template) => {
                                const isSelected = template.id === selectedTemplate?.id
                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => onSelectTemplate(template.id)}
                                        className={cn(
                                            'group rounded-[1.15rem] border p-3 text-left transition-all duration-200',
                                            isSelected
                                                ? 'border-primary/30 bg-primary/[0.05]'
                                                : 'border-border/70 bg-background/92 hover:border-border hover:bg-background'
                                        )}
                                    >
                                        <div className="mb-3 aspect-[16/9] overflow-hidden rounded-[0.95rem] border border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))]">
                                            <img
                                                src={template.imageUrl}
                                                alt={template.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-semibold text-foreground/92">{template.name}</p>
                                            {isSelected ? <IconCheck className="h-4.5 w-4.5 shrink-0 text-primary" /> : null}
                                        </div>
                                    </button>
                                )
                            })}
                            {templates.length === 0 ? (
                                <div className="rounded-[1.15rem] border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
                                    <p className="text-sm font-medium text-foreground/88">No hay plantillas cargadas</p>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        Añádelas desde Admin para que aparezcan aquí.
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>

                <div className="border-t border-border/40 p-4">
                    <Button
                        type="button"
                        className="h-[46px] w-full rounded-[1.1rem]"
                        disabled={!canGenerate || isGenerating}
                        onClick={() => { void onGenerate() }}
                    >
                        {isGenerating ? 'Generando...' : 'Generar imagen'}
                    </Button>
                </div>
            </aside>

            <Dialog open={brandKitDialogOpen} onOpenChange={setBrandKitDialogOpen}>
                <DialogContent className="max-w-[820px] rounded-[1.8rem] border border-border/70 bg-background/98 p-0 shadow-[0_38px_100px_-56px_rgba(15,23,42,0.42)]">
                    <DialogHeader className="px-6 pb-2 pt-6">
                        <DialogTitle>Selecciona una imagen del Kit de marca</DialogTitle>
                    </DialogHeader>
                    <div className="thin-scrollbar max-h-[70vh] overflow-y-auto px-6 pb-6">
                        {brandKitImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                {brandKitImages.map((image) => (
                                    <button
                                        key={image.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectBrandKitImage(image)
                                            setBrandKitDialogOpen(false)
                                        }}
                                        className="group overflow-hidden rounded-[1.2rem] border border-border/70 bg-background text-left transition-all duration-200 hover:border-primary/30 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.22)]"
                                    >
                                        <div className="aspect-[4/3] overflow-hidden border-b border-border/50 bg-muted/30">
                                            <img src={image.url} alt={image.name || 'Imagen del kit de marca'} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                                        </div>
                                        <div className="px-3 py-2.5">
                                            <p className="truncate text-sm font-medium text-foreground/88">
                                                {image.name || 'Imagen del Brand Kit'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center">
                                <p className="text-sm font-medium text-foreground/88">Este Brand Kit aún no tiene imágenes.</p>
                                <p className="mt-1 text-sm text-muted-foreground">Añade referencias visuales en el Kit de marca para reutilizarlas aquí.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
