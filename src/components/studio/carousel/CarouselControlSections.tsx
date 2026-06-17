'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { IconLayers, IconCarousel, IconMinus, IconPlus, IconLayout, IconHistory, IconAlertCircle, IconCheck, IconSave } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionHeader } from '@/components/studio/shared/SectionHeader'
import { CarouselCompositionSelector } from '@/components/studio/carousel/CarouselCompositionSelector'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../../convex/_generated/api'
import {
    STUDIO_RICH_SELECT_TRIGGER_CLASS,
    STUDIO_SELECT_CONTENT_CLASS,
    STUDIO_SELECT_ITEM_CLASS,
} from '@/components/studio/shared/selectStyles'
import {
    PANEL_SECTION_STACK_CLASS,
    PANEL_SECTION_HEADER_ICON_CLASS,
    PANEL_SECTION_HEADER_TITLE_CLASS,
    PANEL_SECONDARY_BUTTON_CLASS,
    PANEL_RICH_SELECT_CONTENT_STYLE,
    pickCompositionId,
} from './CarouselControlsPanel.helpers'
import type { CompositionMode, UiComposition, UiStructure } from './CarouselControlsPanel.types'

type AspectRatio = '1:1' | '4:5' | '3:4'
type StepValue = 1 | 2 | 3 | 4 | 5 | 6 | 7
type WorkSession = NonNullable<FunctionReturnType<typeof api.work_sessions.listSessions>>[number]

/** Selector del numero de diapositivas del carrusel. */
export function SlideCountSection({
    slideCount,
    onChange,
}: {
    slideCount: number
    onChange: (delta: number) => void
}) {
    const { t } = useTranslation('carousel')

    return (
        <>
            <SectionHeader
                icon={IconCarousel}
                title={t('ui.slideCount')}
                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
            />
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onChange(-1)}
                    disabled={slideCount <= 0}
                    aria-label={t('ui.decreaseSlideCount', { defaultValue: 'Reducir número de slides' })}
                >
                    <IconMinus className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center">
                    <span className="text-3xl font-bold">{slideCount}</span>
                    <span className="text-sm text-muted-foreground ml-2">{t('ui.slides')}</span>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onChange(1)}
                    disabled={slideCount >= 15}
                    aria-label={t('ui.increaseSlideCount', { defaultValue: 'Aumentar número de slides' })}
                >
                    <IconPlus className="w-4 h-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('ui.slideRange')}</p>
        </>
    )
}

/** Selector de formato (aspect ratio) del carrusel. */
export function FormatSection({
    aspectRatio,
    onSelect,
}: {
    aspectRatio: AspectRatio
    onSelect: (ratio: AspectRatio) => void
}) {
    const { t } = useTranslation('carousel')

    return (
        <>
            <SectionHeader
                icon={IconLayers}
                title={t('ui.formatTitle')}
                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
            />
            <div className="space-y-2">
                <button
                    onClick={() => onSelect('4:5')}
                    className={cn(
                        'feedback-action flex items-center gap-3 rounded-[1.2rem] border p-3.5 transition-all w-full text-left',
                        aspectRatio === '4:5'
                            ? 'border-primary/35 bg-primary/8 shadow-[0_18px_38px_-30px_rgba(59,130,246,0.3)]'
                            : 'border-border/65 bg-background/74 hover:border-primary/20 hover:bg-[hsl(var(--surface-alt))]/75'
                    )}
                >
                    <div className="w-8 h-10 rounded bg-muted border border-border" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{t('ui.formatVerticalTitle', { defaultValue: 'Standard vertical (portrait)' })}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">4:5</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('ui.formatVerticalDescription', { defaultValue: '1080x1350 · the safest standard to avoid cropping on older devices or Meta Ads.' })}
                        </p>
                    </div>
                </button>
                <button
                    onClick={() => onSelect('3:4')}
                    className={cn(
                        'feedback-action flex items-center gap-3 rounded-[1.2rem] border p-3.5 transition-all w-full text-left',
                        aspectRatio === '3:4'
                            ? 'border-primary/35 bg-primary/8 shadow-[0_18px_38px_-30px_rgba(59,130,246,0.3)]'
                            : 'border-border/65 bg-background/74 hover:border-primary/20 hover:bg-[hsl(var(--surface-alt))]/75'
                    )}
                >
                    <div className="w-8 h-10 rounded bg-muted border border-border" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{t('ui.formatTallTitle', { defaultValue: 'Tall / extended vertical (2026 trend)' })}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">3:4</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('ui.formatTallDescription', { defaultValue: '1080x1440 · +6.6% more screen space · dominates the feed and fits the new vertical grid.' })}
                        </p>
                    </div>
                </button>
                <button
                    onClick={() => onSelect('1:1')}
                    className={cn(
                        'feedback-action flex items-center gap-3 rounded-[1.2rem] border p-3.5 transition-all w-full text-left',
                        aspectRatio === '1:1'
                            ? 'border-primary/35 bg-primary/8 shadow-[0_18px_38px_-30px_rgba(59,130,246,0.3)]'
                            : 'border-border/65 bg-background/74 hover:border-primary/20 hover:bg-[hsl(var(--surface-alt))]/75'
                    )}
                >
                    <div className="w-10 h-10 rounded bg-muted border border-border" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{t('ui.formatSquareTitle', { defaultValue: 'Square (traditional)' })}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">1:1</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('ui.formatSquareDescription', { defaultValue: '1080x1080 · the original classic format for balanced layouts.' })}
                        </p>
                    </div>
                </button>
            </div>
        </>
    )
}

/** Seccion de diseno: modo basico/avanzado, estructura narrativa y composicion. */
export function CompositionSection({
    compositionMode,
    setCompositionMode,
    compositions,
    advancedCompositions,
    compositionId,
    setCompositionId,
    structureId,
    setStructureId,
    structures,
    setHasUserSelectedStructure,
    markStructuralReanalysisNeeded,
    setCurrentStep,
}: {
    compositionMode: CompositionMode
    setCompositionMode: Dispatch<SetStateAction<CompositionMode>>
    compositions: UiComposition[]
    advancedCompositions: UiComposition[]
    compositionId: string
    setCompositionId: Dispatch<SetStateAction<string>>
    structureId: string
    setStructureId: Dispatch<SetStateAction<string>>
    structures: UiStructure[]
    setHasUserSelectedStructure: Dispatch<SetStateAction<boolean>>
    markStructuralReanalysisNeeded: () => void
    setCurrentStep: Dispatch<SetStateAction<StepValue>>
}) {
    const { t } = useTranslation('carousel')

    return (
        <>
            <SectionHeader
                icon={IconLayout}
                title={t('ui.designTitle')}
                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                extra={
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/72 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                        <span className={cn('text-[clamp(0.88rem,0.84rem+0.1vw,0.94rem)] font-medium', compositionMode === 'advanced' ? 'text-primary/90' : 'text-muted-foreground')}>
                            {t('ui.advancedMode')}
                        </span>
                        <Switch
                            checked={compositionMode === 'advanced'}
                        onCheckedChange={(checked) => {
                            const nextMode: CompositionMode = checked ? 'advanced' : 'basic'
                            setCompositionMode(nextMode)
                            setCompositionId(
                                pickCompositionId(
                                    compositions,
                                    nextMode,
                                    compositionId,
                                    `${structureId}|0`
                                )
                            )
                        }}
                            aria-label={t('ui.designAdvancedAria')}
                        />
                    </div>
                }
            />
            <Select
                value={structureId}
                onValueChange={(value) => {
                    setHasUserSelectedStructure(true)
                    setStructureId(value)
                    markStructuralReanalysisNeeded()
                }}
            >
                <SelectTrigger
                    className={STUDIO_RICH_SELECT_TRIGGER_CLASS}
                >
                    <SelectValue placeholder={t('ui.structurePlaceholder')} className="sr-only" />
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="block truncate text-left text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">
                            {structures.find((structure) => structure.id === structureId)?.name || t('ui.structurePlaceholder')}
                        </span>
                    </span>
                </SelectTrigger>
                <SelectContent className={STUDIO_SELECT_CONTENT_CLASS} position="popper" align="start" style={PANEL_RICH_SELECT_CONTENT_STYLE}>
                    {structures.map((structure) => (
                        <SelectItem key={structure.id} value={structure.id} className={STUDIO_SELECT_ITEM_CLASS}>
                            <span className="flex items-center justify-between w-full gap-2">
                                <span>{structure.name}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {compositionMode === 'advanced' ? (
                <>
                    <CarouselCompositionSelector
                        key={`${structureId}-advanced`}
                        compositions={advancedCompositions}
                        selectedId={compositionId}
                        onSelect={(id) => {
                            setCompositionId(id)
                            setCurrentStep(prev => (prev < 4 ? 4 : prev))
                        }}
                    />
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {t('ui.advancedModeDescription')}
                    </p>
                </>
            ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[11px] text-primary font-medium leading-relaxed">
                        {t('ui.basicModeDescription')}
                    </p>
                </div>
            )}
        </>
    )
}

/** Seccion HISTORIAL: estado de guardado, selector de sesiones y acciones. */
export function SessionsSection({
    isSavingSession, saveError, hasUnsavedChanges, lastSavedAt,
    userId, scopedBrandId, isHydratingSession, handleSaveNow,
    selectedSessionToLoad, setSelectedSessionToLoad, currentSessionId,
    handleLoadSession, buildDisplaySessionTitle, activeSessionMeta, workSessions,
    createNewCarouselSession, handleRenameCurrentSession, handleDeleteCurrentSession, handleClearAllSessions,
}: {
    isSavingSession: boolean
    saveError: string | null
    hasUnsavedChanges: boolean
    lastSavedAt: string | null
    userId: string | undefined
    scopedBrandId: string | undefined
    isHydratingSession: boolean
    handleSaveNow: () => unknown
    selectedSessionToLoad: string
    setSelectedSessionToLoad: Dispatch<SetStateAction<string>>
    currentSessionId: string | null
    handleLoadSession: (id: string) => Promise<boolean>
    buildDisplaySessionTitle: (value?: string | null, customized?: boolean) => string
    activeSessionMeta: WorkSession | null
    workSessions: WorkSession[] | undefined
    createNewCarouselSession: () => unknown
    handleRenameCurrentSession: () => void | Promise<void>
    handleDeleteCurrentSession: () => void | Promise<void>
    handleClearAllSessions: () => void | Promise<void>
}) {
    const { t, i18n } = useTranslation('carousel')

    return (
                    <div className={PANEL_SECTION_STACK_CLASS}>
                        <SectionHeader
                            icon={IconHistory}
                            title={t('ui.history')}
                            className="mb-2"
                            iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                            titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                            extra={
                                <div className="flex items-center gap-2">
                                    <span className="text-[clamp(0.88rem,0.84rem+0.1vw,0.94rem)] text-muted-foreground inline-flex items-center gap-1">
                                        {isSavingSession ? (
                                            <>
                                                <Loader2 className="h-3 w-3" />
                                                {t('ui.saving')}
                                            </>
                                        ) : saveError ? (
                                            <>
                                                <IconAlertCircle className="h-3 w-3" />
                                                {t('ui.errorShort')}
                                            </>
                                        ) : hasUnsavedChanges ? (
                                            t('ui.unsavedChanges')
                                        ) : lastSavedAt ? (
                                            <>
                                                <IconCheck className="h-3 w-3" />
                                                {t('ui.savedAt', {
                                                    time: new Date(lastSavedAt).toLocaleTimeString(i18n.language || t('ui.locale'), { hour: '2-digit', minute: '2-digit' })
                                                })}
                                            </>
                                        ) : t('ui.noChanges')}
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-[1rem] border border-border/65 bg-background/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                                        onClick={() => void handleSaveNow()}
                                        disabled={!userId || !scopedBrandId || isHydratingSession || isSavingSession || !hasUnsavedChanges}
                                        title={t('ui.saveSessionNow')}
                                    >
                                        <IconSave
                                            className={cn(
                                                "h-3.5 w-3.5 transition-colors",
                                                isSavingSession
                                                    ? "text-muted-foreground/40"
                                                    : hasUnsavedChanges
                                                        ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.45)]"
                                                        : "text-muted-foreground/55"
                                            )}
                                        />
                                    </Button>
                                </div>
                            }
                        />
                        <div className="space-y-3 pt-1.5">
                            <Select
                                value={selectedSessionToLoad || currentSessionId || ''}
                                onValueChange={(id) => {
                                    setSelectedSessionToLoad(id)
                                    if (id && id !== currentSessionId) {
                                        void handleLoadSession(id).then((loaded) => {
                                            if (!loaded) {
                                                setSelectedSessionToLoad(currentSessionId || '')
                                            }
                                        })
                                    }
                                }}
                            >
                                <SelectTrigger className={STUDIO_RICH_SELECT_TRIGGER_CLASS}>
                                    <SelectValue
                                        placeholder={t('ui.noSessions')}
                                        className="sr-only"
                                    />
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="block truncate text-left text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">
                                            {buildDisplaySessionTitle(activeSessionMeta?.title || t('ui.noSessions'), Boolean(activeSessionMeta?.title_customized))}
                                        </span>
                                        {activeSessionMeta?.active ? (
                                            <span className="whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.78rem] font-semibold text-primary">
                                                {t('ui.activeSession')}
                                            </span>
                                        ) : null}
                                        {activeSessionMeta?.updated_at ? (
                                            <span className="shrink-0 text-[0.82rem] text-muted-foreground">
                                                {new Date(activeSessionMeta.updated_at).toLocaleTimeString(i18n.language || t('ui.locale'), { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        ) : null}
                                    </span>
                                </SelectTrigger>
                                <SelectContent className={STUDIO_SELECT_CONTENT_CLASS} position="popper" align="start" style={PANEL_RICH_SELECT_CONTENT_STYLE}>
                                    {(workSessions || []).length === 0 ? (
                                        <SelectItem value="__none" disabled className={STUDIO_SELECT_ITEM_CLASS}>
                                            {t('ui.noSessions')}
                                        </SelectItem>
                                    ) : null}
                                    {(workSessions || []).map((session) => (
                                        <SelectItem key={String(session._id)} value={String(session._id)} className={STUDIO_SELECT_ITEM_CLASS}>
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="truncate">
                                                    {buildDisplaySessionTitle(session.title || t('ui.untitledSession'), Boolean(session.title_customized))}
                                                </span>
                                                {session.active ? (
                                                    <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.78rem] font-semibold text-primary">
                                                        {t('ui.activeSession')}
                                                    </span>
                                                ) : null}
                                                <span className="shrink-0 text-[0.82rem] text-muted-foreground">
                                                    {new Date(session.updated_at).toLocaleTimeString(i18n.language || t('ui.locale'), { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button
                                variant="default"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={() => void createNewCarouselSession()}
                            >
                                <IconPlus className="mr-1.5 h-3.5 w-3.5" />
                                {t('ui.newSession')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={() => void handleRenameCurrentSession()}
                                disabled={!currentSessionId}
                            >
                                {t('ui.renameSession')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={() => void handleDeleteCurrentSession()}
                            >
                                {t('ui.deleteSession')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={() => void handleClearAllSessions()}
                            >
                                {t('ui.deleteAllSessions', { defaultValue: 'Borrar todas las sesiones' })}
                            </Button>
                        </div>
                    </div>
    )
}
