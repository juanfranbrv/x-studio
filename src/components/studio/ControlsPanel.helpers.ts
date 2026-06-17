import {
    STUDIO_SELECT_CONTENT_CLASS,
    STUDIO_SELECT_ITEM_CLASS,
    STUDIO_RICH_SELECT_TRIGGER_CLASS,
    STUDIO_SELECT_TRIGGER_CLASS,
} from '@/components/studio/shared/selectStyles'

export const RESET_USES4_FLAG = 'admin_layout_ratings_reset_uses4_done_v1'
export const PANEL_SECTION_HEADER_ICON_CLASS = "h-9 w-9 rounded-none border-0 bg-transparent text-foreground/72 shadow-none"
// Acento por bloque: rayita de color en el filo superior de la tarjeta (justo
// bajo la grieta). Solo cambia el tono por sección vía la variable --accent-line;
// la geometría de la línea vive en PANEL_SECTION_DIVIDER_BASE_CLASS (pseudo ::after).
// Paleta media: apagada y de luminosidad pareja para localizar sin "Disneylandia".
export const PANEL_SECTION_ACCENTS = {
    history: "[--accent-line:hsl(222_45%_56%)]",
    idea: "[--accent-line:hsl(36_75%_52%)]",
    slides: "[--accent-line:hsl(20_72%_56%)]",
    design: "[--accent-line:hsl(245_68%_62%)]",
    format: "[--accent-line:hsl(185_62%_40%)]",
    content: "[--accent-line:hsl(212_78%_56%)]",
    style: "[--accent-line:hsl(344_72%_58%)]",
    logos: "[--accent-line:hsl(270_58%_62%)]",
    brand: "[--accent-line:hsl(154_58%_42%)]",
} as const
export const PANEL_SECTION_HEADER_TITLE_CLASS = "text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92"
export const PANEL_SECTION_SELECT_TRIGGER_CLASS = STUDIO_SELECT_TRIGGER_CLASS
export const PANEL_SECTION_SELECT_CONTENT_CLASS = STUDIO_SELECT_CONTENT_CLASS
export const PANEL_SECTION_SELECT_ITEM_CLASS = STUDIO_SELECT_ITEM_CLASS
export const PANEL_SECTION_LABEL_CLASS = "text-[0.78rem] font-semibold text-foreground/90 uppercase tracking-[0.08em]"
export const PANEL_SECTION_HELPER_CLASS = "text-[0.84rem] text-muted-foreground leading-relaxed"
export const PANEL_TEXT_BUTTON_REVEAL_CLASS = "rounded-xl px-3 py-2 text-[clamp(0.9rem,0.86rem+0.12vw,0.98rem)] text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] disabled:opacity-50"
export const PANEL_SECONDARY_BUTTON_CLASS = "min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal"
export const PANEL_RICH_SELECT_TRIGGER_CLASS = STUDIO_RICH_SELECT_TRIGGER_CLASS
export const PANEL_RICH_SELECT_CONTENT_STYLE = {
    width: 'var(--radix-select-trigger-width)',
    minWidth: 'var(--radix-select-trigger-width)',
    maxWidth: 'var(--radix-select-trigger-width)',
} as const
export const BRAND_KIT_GROUP_CLASS = "space-y-3"
export const BRAND_KIT_CONTACT_ROW_CLASS = "space-y-2 border-b border-border/40 py-2.5 last:border-b-0"
export const BRAND_KIT_SUBTLE_BUTTON_CLASS = "h-9 rounded-xl border border-border/65 bg-background/82 px-3 text-[0.9rem] font-medium text-foreground/88 transition-all duration-200 hover:border-border/90 hover:bg-background hover:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.18)]"
export const PANEL_SECTION_DIVIDER_BASE_CLASS = "relative -mx-4 px-4 pb-5 pt-10 last:pb-0 before:absolute before:left-0 before:right-0 before:top-0 before:h-[12px] before:bg-[hsl(var(--surface))] before:shadow-[inset_0_5px_7px_-3px_rgba(15,23,42,0.20),inset_0_-4px_6px_-4px_rgba(15,23,42,0.10)] after:absolute after:left-0 after:right-0 after:top-[12px] after:h-[3px] after:rounded-full after:bg-[var(--accent-line,transparent)] md:-mx-5 md:px-5"
export const PANEL_SECTION_DIVIDER_WRAP_CLASS = `${PANEL_SECTION_DIVIDER_BASE_CLASS} first:pt-0 first:before:hidden first:after:hidden`
export const PANEL_SECTION_STACK_CLASS = `${PANEL_SECTION_DIVIDER_WRAP_CLASS} space-y-[0.85rem]`
export const PANEL_SECTION_SURFACE_CLASS = "rounded-2xl border border-border/65 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
export const PANEL_SECTION_BODY_CLASS = "rounded-[1.5rem] border border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.74))] px-4 py-4 shadow-[0_16px_38px_-36px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur-[8px]"

export function normalizeHexColor(color: string): string {
    const base = (color || '').trim().toLowerCase()
    if (!base) return '#000000'
    const withHash = base.startsWith('#') ? base : `#${base}`
    return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash : '#000000'
}
