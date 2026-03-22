import { STUDIO_PANEL_CARD_CLASS } from '@/components/studio/shared/panelStyles'

export const BRAND_KIT_PAGE_SHELL_CLASS =
  'rounded-[2rem] border border-border/70 bg-background/96 shadow-[0_34px_90px_-56px_rgba(15,23,42,0.32)] backdrop-blur-sm'

export const BRAND_KIT_PANEL_CLASS =
  `${STUDIO_PANEL_CARD_CLASS} overflow-hidden`

export const BRAND_KIT_PANEL_SUBTLE_CLASS =
  'rounded-[1.35rem] border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.74,white)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_-36px_rgba(15,23,42,0.18)]'

export const BRAND_KIT_PANEL_HEADER_CLASS = 'flex flex-col gap-2 px-6 pb-0 pt-[1.15rem]'

export const BRAND_KIT_PANEL_TITLE_CLASS =
  'flex items-center gap-3 text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 [&_svg]:self-center [&_svg]:text-foreground/72'

export const BRAND_KIT_PANEL_HEADER_ICON_CLASS = 'shrink-0 text-foreground/72'

export const BRAND_KIT_PANEL_DESCRIPTION_CLASS =
  'text-[0.84rem] leading-relaxed text-muted-foreground/80'

export const BRAND_KIT_SECTION_LABEL_CLASS =
  'text-[0.78rem] font-semibold text-foreground/90 uppercase tracking-[0.08em] mb-1.5'

export const BRAND_KIT_CALLOUT_CLASS =
  'rounded-[1.35rem] border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.6,white)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'

export const BRAND_KIT_FIELD_CLASS =
  'h-10 rounded-2xl border border-input/80 bg-background px-3.5 text-[0.9rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary'

export const BRAND_KIT_TEXTAREA_CLASS =
  'w-full rounded-[1.2rem] border border-input/80 bg-background px-4 py-3 text-[14px] leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-all hover:border-primary/20 focus:outline-none focus:ring-0 focus:border-primary'

export const BRAND_KIT_SECONDARY_BUTTON_CLASS =
  'h-[42px] rounded-[1rem] px-4 text-[0.96rem] font-medium'

export const BRAND_KIT_GHOST_BUTTON_CLASS =
  'h-[40px] rounded-[1rem] px-3.5 text-[0.92rem] font-medium'

export const BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS =
  'h-[42px] w-full rounded-[1rem] border-dashed border-border text-[0.94rem] font-medium hover:border-primary/25 hover:bg-[hsl(var(--surface-alt))]'

export const BRAND_KIT_REMOVE_BUTTON_CLASS =
  'absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/92 text-muted-foreground opacity-0 shadow-sm transition-all hover:scale-110 hover:text-red-500 group-hover:opacity-100'

export const BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS =
  'mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/65 bg-background/88 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all hover:scale-105 hover:border-red-500/25 hover:bg-red-500/8 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100'

export const BRAND_KIT_TOKEN_CARD_CLASS =
  'rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.82,white)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_18px_40px_-36px_rgba(15,23,42,0.16)] transition-all'

export const BRAND_KIT_ACTIVE_TOKEN_CARD_CLASS =
  `${BRAND_KIT_TOKEN_CARD_CLASS} border-primary/35 bg-[linear-gradient(180deg,hsl(var(--surface))/0.98,white)] shadow-[0_24px_54px_-42px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]`

export const BRAND_KIT_MUTED_TOKEN_CARD_CLASS =
  `${BRAND_KIT_TOKEN_CARD_CLASS} bg-[hsl(var(--surface-alt))]/50 text-muted-foreground`

export const BRAND_KIT_ASSET_SURFACE_CLASS =
  'rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.72,white)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_40px_-34px_rgba(15,23,42,0.14)]'

export const BRAND_KIT_UPLOAD_SURFACE_CLASS =
  'rounded-[1.35rem] border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.68,white)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-all hover:border-primary/25 hover:bg-[linear-gradient(180deg,hsl(var(--surface))/0.94,white)]'

export const BRAND_KIT_FLOATING_PALETTE_CLASS =
  'fixed right-6 top-24 z-[60] hidden md:grid grid-cols-3 gap-1.5 pointer-events-auto rounded-[1.65rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] p-2 text-muted-foreground shadow-[0_24px_54px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl'

export const BRAND_KIT_MODAL_CLASS =
  'max-w-[min(92vw,38rem)] rounded-[1.8rem] border border-border/70 bg-background/98 p-0 shadow-[0_40px_100px_-58px_rgba(15,23,42,0.42)]'

export const BRAND_KIT_MODAL_HEADER_CLASS = 'gap-3 px-6 pb-4 pt-6 text-left sm:text-left'
export const BRAND_KIT_MODAL_TITLE_CLASS =
  'pr-10 text-[clamp(1.16rem,1.08rem+0.18vw,1.28rem)] font-semibold tracking-[-0.01em]'
export const BRAND_KIT_MODAL_DESCRIPTION_CLASS =
  'text-[1rem] leading-relaxed text-muted-foreground'
export const BRAND_KIT_MODAL_FOOTER_CLASS = 'gap-2 px-6 pb-6 pt-0 sm:justify-end'
