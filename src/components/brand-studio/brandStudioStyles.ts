/**
 * Brand Studio Wizard — shared style constants
 * Follows the same premium language as brandKitStyles.ts and panelStyles.ts
 */

// ─── Step Layout ─────────────────────────────────────────────

export const WIZARD_STEP_CONTAINER =
  'flex min-h-dvh flex-col items-center justify-center px-[clamp(1rem,4vw,3rem)] pt-[clamp(4rem,8vh,6rem)] pb-[clamp(12rem,24vh,20rem)]'

export const WIZARD_STEP_CONTENT =
  'w-full max-w-[min(92vw,56rem)] space-y-[clamp(1.5rem,4vh,2.5rem)]'

export const WIZARD_STEP_CONTENT_WIDE =
  'w-full max-w-[min(96vw,82rem)] space-y-[clamp(1.5rem,4vh,2.5rem)]'

// ─── Typography ──────────────────────────────────────────────

export const WIZARD_TITLE =
  'text-4xl font-semibold tracking-[-0.02em] leading-tight sm:text-5xl'

export const WIZARD_SUBTITLE =
  'text-lg leading-relaxed text-muted-foreground sm:text-xl'

export const WIZARD_SECTION_LABEL =
  'text-base font-semibold uppercase tracking-[0.12em] text-muted-foreground'

// ─── Selection Cards ─────────────────────────────────────────
// Interactive cards for choosing palettes, fonts, sources, taglines

export const WIZARD_CARD =
  'relative rounded-[1.35rem] border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.74,white)] p-7 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_-36px_rgba(15,23,42,0.14)] transition-all duration-200 hover:border-primary/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_22px_54px_-38px_rgba(15,23,42,0.22)] active:scale-[0.98]'

export const WIZARD_CARD_ACTIVE =
  'relative rounded-[1.35rem] border border-primary/40 bg-[linear-gradient(180deg,hsl(var(--primary)/0.05),white)] p-7 text-left shadow-[0_24px_54px_-42px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200'

// Compact variant for smaller cards (source icons, etc.)
export const WIZARD_CARD_COMPACT =
  'relative rounded-[1.2rem] border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.74,white)] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_34px_-30px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-primary/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_44px_-34px_rgba(15,23,42,0.2)] active:scale-[0.98]'

export const WIZARD_CARD_COMPACT_ACTIVE =
  'relative rounded-[1.2rem] border border-primary/40 bg-[linear-gradient(180deg,hsl(var(--primary)/0.05),white)] p-4 text-left shadow-[0_18px_44px_-36px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200'

// ─── Chips (toggle pills) ───────────────────────────────────

export const WIZARD_CHIP =
  'rounded-full border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.6,white)] px-6 py-3 text-base font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-200 hover:border-primary/30 hover:text-foreground active:scale-[0.96]'

export const WIZARD_CHIP_ACTIVE =
  'rounded-full border border-primary/40 bg-[linear-gradient(180deg,hsl(var(--primary)/0.1),hsl(var(--primary)/0.04))] px-6 py-3 text-base font-medium text-primary shadow-[0_8px_24px_-16px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-200 active:scale-[0.96]'

// ─── Color Swatches ──────────────────────────────────────────

export const WIZARD_SWATCH =
  'h-11 w-11 rounded-xl border border-border/30 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.15)] transition-transform duration-200 hover:scale-110'

export const WIZARD_SWATCH_LABEL =
  'text-xs text-muted-foreground leading-tight mt-1'

// ─── Inputs ──────────────────────────────────────────────────

export const WIZARD_INPUT =
  'h-16 rounded-2xl border border-input/80 bg-background px-6 !text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary placeholder:!text-xl'

export const WIZARD_INPUT_LARGE =
  'h-20 rounded-2xl border border-input/80 bg-background px-8 !text-3xl font-semibold text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary placeholder:!text-3xl'

export const WIZARD_TEXTAREA =
  'w-full rounded-2xl border border-input/80 bg-background px-6 py-5 !text-lg leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-all hover:border-primary/20 focus:outline-none focus:ring-0 focus:border-primary resize-none placeholder:!text-lg'

// ─── Buttons ─────────────────────────────────────────────────

export const WIZARD_CTA_BUTTON =
  'h-14 rounded-2xl px-10 text-lg font-medium'

export const WIZARD_SECONDARY_BUTTON =
  'h-12 rounded-xl px-6 text-base font-medium'

export const WIZARD_GHOST_BUTTON =
  'h-12 rounded-xl px-5 text-base font-medium text-muted-foreground'

// ─── Upload Surface ──────────────────────────────────────────

export const WIZARD_UPLOAD_ZONE =
  'rounded-2xl border border-dashed border-border/70 bg-[hsl(var(--surface-alt))/0.5] p-4 text-center transition-all duration-200 hover:border-primary/30 hover:bg-[hsl(var(--surface-alt))/0.7]'

// ─── Preview Card ────────────────────────────────────────────

export const WIZARD_PREVIEW_SHELL =
  'rounded-2xl border border-border/60 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.96,white)] shadow-[0_22px_65px_-42px_rgba(15,23,42,0.36)] overflow-hidden'

// ─── Divider ─────────────────────────────────────────────────

export const WIZARD_DIVIDER_WITH_TEXT =
  'flex items-center gap-3 text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground/60 before:h-px before:flex-1 before:bg-border/50 after:h-px after:flex-1 after:bg-border/50'
