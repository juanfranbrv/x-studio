'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { LayoutOption } from '@/lib/creation-flow-types'
import type { LegacyComposition } from '@/lib/legacy-compositions'
import { IconEditorSection } from '@/components/admin/IconEditorSection'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { saveAction, deleteAction, regenerateIconAction } from '@/lib/admin-compositions-actions'
import { IconDelete, IconRefresh, IconSave, IconClose } from '@/components/ui/icons'

interface CompositionEditorProps {
    composition: LegacyComposition | null
    isBasic: boolean
    isNew?: boolean
}

export function CompositionEditor({
    composition,
    isBasic,
    isNew = false
}: CompositionEditorProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleClose = () => {
        router.push('/admin/compositions')
    }

    // Local state for the switch
    // User says: "por defecto está en Avanzado. Si lo activo el switch, lo establezco como básico."
    // So: Checked = Basic, Unchecked = Advanced (default)
    const [basicEnabled, setBasicEnabled] = useState(isBasic)

    useEffect(() => {
        setBasicEnabled(isBasic)
    }, [isBasic, composition?.id])

    if (!composition && !isNew) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center border-l border-border bg-muted/10">
                <p>Selecciona un diseño para editar o haz clic en &quot;Nuevo diseño&quot;</p>
            </div>
        )
    }

    const currentSource = composition?.source || 'custom'

    return (
        <div className="flex flex-col h-full bg-background border-l border-border shadow-xl">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">
                        {isNew ? 'Nuevo Diseño' : 'Editar Diseño'}
                    </h2>
                    {!isNew && <p className="text-xs text-muted-foreground font-mono mt-1">{composition?.id}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
                    <IconClose className="h-5 w-5" />
                </Button>
            </header>

            <form
                action={async (formData) => {
                    // Manual append since Switch doesn't work like checkbox in native forms easily for name/value
                    if (basicEnabled) formData.append('modeBasic', 'on')
                    formData.append('modeAdvanced', 'on') // Always Advanced

                    startTransition(async () => {
                        await saveAction(formData)
                        if (isNew) router.push('/admin/compositions')
                    })
                }}
                className="flex-1 overflow-y-auto p-6 space-y-6 thin-scrollbar"
            >
                <input type="hidden" name="source" value={currentSource} />
                <input type="hidden" name="originalId" value={composition?.id || ''} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="id" className="text-muted-foreground text-xs uppercase">ID Único</Label>
                        <Input
                            id="id"
                            name="id"
                            defaultValue={composition?.id || ''}
                            readOnly={!isNew}
                            placeholder="id-del-diseno"
                            className="bg-muted/50 font-mono text-sm focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-muted-foreground text-xs uppercase">Nombre Visual</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={composition?.name || ''}
                            placeholder="Nombre amigable..."
                            className="focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-muted-foreground text-xs uppercase">Descripción Interna</Label>
                    <Textarea
                        id="description"
                        name="description"
                        defaultValue={composition?.description || ''}
                        rows={2}
                        placeholder="¿Qué hace este diseño?"
                        className="focus:ring-primary/20 resize-none"
                    />
                </div>

                <div className="rounded-xl border border-border p-4 bg-muted/10">
                    <IconEditorSection initialSvg={composition?.svgIcon || ''} />
                </div>

                <div className="space-y-2 group">
                    <Label htmlFor="promptInstruction" className="text-muted-foreground text-xs uppercase group-hover:text-primary transition-colors">Prompt Instruction (Logica)</Label>
                    <Textarea
                        id="promptInstruction"
                        name="promptInstruction"
                        defaultValue={composition?.promptInstruction || ''}
                        rows={4}
                        className="font-mono text-sm bg-muted/20 focus:bg-background transition-colors focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-2 group">
                    <Label htmlFor="structuralPrompt" className="text-muted-foreground text-xs uppercase group-hover:text-primary transition-colors">Prompt Estructural (Diseño)</Label>
                    <Textarea
                        id="structuralPrompt"
                        name="structuralPrompt"
                        defaultValue={composition?.structuralPrompt || ''}
                        rows={6}
                        className="font-mono text-sm bg-muted/20 focus:bg-background transition-colors focus:ring-primary/20"
                    />
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/5 flex items-center justify-between">
                    <div className="space-y-1">
                        <Label className="text-base font-semibold">Modo Básico</Label>
                        <p className="text-xs text-muted-foreground">
                            {basicEnabled
                                ? "Visible en la interfaz simplificada."
                                : "Activa para mostrar en el modo básico."}
                        </p>
                    </div>
                    <Switch
                        checked={basicEnabled}
                        onCheckedChange={setBasicEnabled}
                    />
                </div>

                {/* Hidden field for advanced if we want to preserve both, but usually it's one or both.
            The user said 'un switch'. If they want it to be Advanced by default, and Basic if marked.
        */}
                <input type="hidden" name="modeAdvanced" value="on" />
                <input type="hidden" name="modeBasic" value={basicEnabled ? 'on' : 'off'} />
                <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
                    <div className="flex gap-2">
                        {!isNew && (
                            <>
                                <Button
                                    type="submit"
                                    formAction={deleteAction}
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10 border-destructive/20"
                                >
                                    <IconDelete className="h-4 w-4 mr-2" />
                                    Eliminar
                                </Button>
                                <Button
                                    type="submit"
                                    formAction={regenerateIconAction}
                                    variant="outline"
                                    className="hidden sm:flex"
                                >
                                    <IconRefresh className="h-4 w-4 mr-2" />
                                    Refrescar Icono
                                </Button>
                            </>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11"
                        disabled={isPending}
                    >
                        <IconSave className="h-4 w-4 mr-2" />
                        {isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
