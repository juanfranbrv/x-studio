import { getAutomaticBasicComposition } from '@/lib/carousel-selection'
import type { CompositionMode, UiComposition } from './CarouselControlsPanel.types'

export function normalizeHexColor(color: string): string {
    const base = (color || '').trim().toLowerCase()
    if (!base) return '#000000'
    const withHash = base.startsWith('#') ? base : `#${base}`
    return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash : '#000000'
}

export const PANEL_SECTION_HEADER_ICON_CLASS = 'h-9 w-9 rounded-none border-0 bg-transparent text-foreground/72 shadow-none'
export const PANEL_SECTION_HEADER_TITLE_CLASS = 'text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92'
export const PANEL_TEXT_BUTTON_REVEAL_CLASS = 'rounded-xl px-3 py-2 text-[clamp(0.9rem,0.86rem+0.12vw,0.98rem)] text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] disabled:opacity-50'
export const PANEL_SECONDARY_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'
export const PANEL_RICH_SELECT_CONTENT_STYLE = {
    width: 'var(--radix-select-trigger-width)',
    minWidth: 'var(--radix-select-trigger-width)',
    maxWidth: 'var(--radix-select-trigger-width)',
} as const
export const PANEL_SECTION_DIVIDER_WRAP_CLASS = 'relative py-5 first:pt-0 last:pb-0 before:absolute before:left-[-1rem] before:right-[-1rem] before:top-0 before:h-[2px] before:bg-border/35 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.04)] first:before:hidden'
export const PANEL_SECTION_STACK_CLASS = `${PANEL_SECTION_DIVIDER_WRAP_CLASS} space-y-[0.85rem]`
export const PANEL_SECTION_SURFACE_CLASS = 'rounded-2xl border border-border/65 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
export const ADVANCED_COMPOSITION_MODAL_CLASS = 'h-[min(90vh,920px)] w-[min(94vw,1200px)] !max-w-[min(94vw,1200px)] overflow-hidden rounded-[1.9rem] border border-border/70 bg-background/98 p-0 shadow-[0_38px_100px_-56px_rgba(15,23,42,0.42)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.985] data-[state=closed]:zoom-out-[0.985] data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2 duration-200 flex flex-col'

export const STYLE_OPTIONS = [
    { id: 'minimal', label: 'Minimalist' },
    { id: 'gradient', label: 'Gradients' },
    { id: 'photo', label: 'Photographic' },
    { id: 'illustration', label: 'Illustration' },
    { id: 'bold', label: 'Bold & Typographic' },
    { id: 'elegant', label: 'Elegant' },
]

export function pickCompositionId(
    compositions: UiComposition[],
    mode: CompositionMode,
    selectedId: string | undefined,
    seed: string
): string {
    if (!compositions.length) return 'free'

    if (mode === 'basic') {
        const picked = getAutomaticBasicComposition(compositions, seed, {
            prompt: seed.split('|')[1] || '',
            slideCount: Number(seed.split('|')[2] || 0) || 5
        })
        return picked?.id || compositions[0]?.id || 'free'
    }

    if (selectedId && compositions.some((composition) => composition.id === selectedId)) {
        return selectedId
    }
    return compositions[0]?.id || 'free'
}
