import {
    STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS,
    STUDIO_CANVAS_TOOL_BUTTON_CLASS,
    STUDIO_CANVAS_TOOL_VALUE_CLASS,
} from '@/components/studio/shared/canvasStyles'

export const VISUAL_INTENT_MARKERS = [
    'Objetivo visual de esta slide:',
    'Objectiu visual d’aquesta slide:',
    'Visual goal for this slide:',
    'Objectif visuel de cette slide',
    'Visuelles Ziel dieser Folie',
    'Objetivo visual deste slide',
    'Obiettivo visivo di questa slide',
]

export const DEFAULT_SLIDE_DURATION_MS = 4000
export const DEFAULT_LAST_SLIDE_DURATION_MS = 6000

export function formatDurationLabel(durationMs: number) {
    const seconds = durationMs / 1000
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`
}

export function splitVisualPromptForEditor(value: string): { editable: string; hiddenIntent: string } {
    const normalized = String(value || '').trim()
    if (!normalized) {
        return { editable: '', hiddenIntent: '' }
    }

    const markerIndexes = VISUAL_INTENT_MARKERS
        .map((marker) => normalized.indexOf(marker))
        .filter((index) => index > 0)

    const firstMarkerIndex = markerIndexes.length > 0 ? Math.min(...markerIndexes) : -1

    if (firstMarkerIndex === -1) {
        return {
            editable: normalized,
            hiddenIntent: '',
        }
    }

    return {
        editable: normalized.slice(0, firstMarkerIndex).trim(),
        hiddenIntent: normalized.slice(firstMarkerIndex).trim(),
    }
}

export const CANVAS_FLOATING_TOOLBAR_CLASS = STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS
export const CANVAS_TOOL_BUTTON_CLASS = STUDIO_CANVAS_TOOL_BUTTON_CLASS
export const CANVAS_TOOL_VALUE_CLASS = STUDIO_CANVAS_TOOL_VALUE_CLASS
export const CANVAS_TOOL_ICON_CLASS = '!h-8 !w-8'
