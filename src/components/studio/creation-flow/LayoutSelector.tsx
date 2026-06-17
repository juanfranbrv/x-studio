'use client'

import { cn } from'@/lib/utils'
import { motion } from'framer-motion'
import type { LayoutOption, IntentCategory } from'@/lib/creation-flow-types'
import { CompositionPreviewThumbnail, getCompositionPreviewData } from'./MotifVisualPicker'
import { renderLucideLayoutIcon } from'@/lib/layout-icon'
import { renderMaterialIconBridge } from '@/components/ui/material-icon-bridge'
import {
 getLayoutRatingStats,
 type LayoutRatingStoreEntry,
} from'@/lib/layout-ratings'
import { useTranslation } from'react-i18next'


interface LayoutSelectorProps {
 availableLayouts: LayoutOption[]
 recommendedLayouts?: LayoutOption[]
 allLayouts?: LayoutOption[]
 selectedLayout: string | null
 onSelectLayout: (layoutId: string) => void
 intent?: IntentCategory
 isAdmin?: boolean
 layoutRatings?: Record<string, LayoutRatingStoreEntry>
}

export function LayoutSelector({
 availableLayouts,
 recommendedLayouts,
 allLayouts,
 selectedLayout,
 onSelectLayout,
 intent,
 isAdmin = false,
 layoutRatings = {},
}: LayoutSelectorProps) {
 const { t } = useTranslation('common')
 if (availableLayouts.length === 0) {
 return null
 }

 const cleanSentence = (value?: string | null) => {
 const text = (value ||'').replace(/\s+/g,'').trim()
 if (!text) return''
 const withoutTrail = text.replace(/[.;:,\s]+$/g,'')
 return `${withoutTrail.charAt(0).toUpperCase()}${withoutTrail.slice(1)}.`
 }

 const textZoneLabel = (zone: LayoutOption['textZone']) => {
 switch (zone) {
 case'top': return t('layoutSelector.zones.top', { defaultValue:'top area' })
 case'bottom': return t('layoutSelector.zones.bottom', { defaultValue:'bottom area' })
 case'left': return t('layoutSelector.zones.left', { defaultValue:'left column' })
 case'right': return t('layoutSelector.zones.right', { defaultValue:'right column' })
 case'center': return t('layoutSelector.zones.center', { defaultValue:'central area' })
 case'top-left': return t('layoutSelector.zones.topLeft', { defaultValue:'top-left corner' })
 case'top-right': return t('layoutSelector.zones.topRight', { defaultValue:'top-right corner' })
 case'bottom-left': return t('layoutSelector.zones.bottomLeft', { defaultValue:'bottom-left corner' })
 case'bottom-right': return t('layoutSelector.zones.bottomRight', { defaultValue:'bottom-right corner' })
 case'overlay': return t('layoutSelector.zones.overlay', { defaultValue:'image overlay' })
 default: return t('layoutSelector.zones.default', { defaultValue:'main area' })
 }
 }

 const extractStructuralLine = (layout: LayoutOption) => {
 const prompt = layout.structuralPrompt ||''
 const structureMatch = prompt.match(/\*\*Estructura:\*\*\s*([^\n]+)/i)
 if (structureMatch?.[1]) {
 return cleanSentence(structureMatch[1])
 }
 return cleanSentence(t('layoutSelector.structuralFallback', {
 defaultValue:'Layout designed for clear reading in {{zone}}',
 zone: textZoneLabel(layout.textZone)
 }))
 }

 const buildTooltip = (layout: LayoutOption) => {
 const line1 = cleanSentence(layout.description) || cleanSentence(t('layoutSelector.visualReadingDesign', { defaultValue:'Visual reading layout' }))
 const line2 = extractStructuralLine(layout)
 return [line1, line2].join('\n')
 }

 const renderGrid = (layouts: LayoutOption[], opts?: { recommended?: boolean }) => (
 <div className="grid grid-cols-3 gap-2">
 {layouts.map(layout => {
 const isSelected = selectedLayout === layout.id
 const title = layout.name || t('layoutSelector.defaultTitle', { defaultValue:'Layout' })
 // description already contains the fallback to structuralPrompt and cleaning logic
 const description = cleanSentence(layout.description) || extractStructuralLine(layout)

 const preview = getCompositionPreviewData(
 {
 _id: layout.id,
 name: layout.name,
 description: layout.description,
 slug: layout.id,
 structuralPrompt: layout.structuralPrompt,
 promptInstruction: layout.promptInstruction,
 textZone: layout.textZone,
 intentId: intent,
 },
'motif'
 )
 const hasInlineSvg = typeof layout.svgIcon ==='string' && layout.svgIcon.trim().startsWith('<svg')
 const hasNamedIcon = typeof layout.svgIcon === 'string' && layout.svgIcon.trim().length > 0 && !hasInlineSvg

 return (
 <motion.button
 key={layout.id}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => onSelectLayout(layout.id)}
 aria-label={`${title}: ${description}`}
 aria-pressed={isSelected}
 className={cn(
 'group relative flex h-full flex-col overflow-hidden rounded-[1rem] text-left transition-all duration-300',
 'border backdrop-blur-sm',
 isSelected
 ?'border-primary/32 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
 :'border-border/55 bg-background/55 hover:border-border/80 hover:bg-background/92 hover:shadow-[0_16px_32px_-28px_rgba(15,23,42,0.2)]'
 )}
 >
 {isAdmin && (
 <div className="absolute right-1.5 top-1.5 z-20 rounded-md border border-border/70 bg-white px-1.5 py-0.5 backdrop-blur">
 {(() => {
 const stats = getLayoutRatingStats(layout.id, layoutRatings)
 return (
 <span className="text-[9px] font-semibold text-foreground">
 {stats.average.toFixed(1)} · {stats.totalPoints}/{stats.uses || 0}
 </span>
 )
 })()}
 </div>
 )}
 {opts?.recommended && (
 <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary/90 text-primary-foreground text-[8px] px-1.5 py-0.5 uppercase tracking-wide font-semibold">
 {t('layoutSelector.recommendedBadge', { defaultValue:'Rec.' })}
 </span>
 )}
 <div className={cn(
'w-full overflow-hidden px-1 py-2.5 flex items-center justify-center transition-colors',
 isSelected
 ?'bg-primary/[0.055]'
 :'bg-background/40 group-hover:bg-background/78'
 )}>
 {hasInlineSvg ? (
 <div
 className={cn(
'h-11 w-11 overflow-hidden flex items-center justify-center text-primary/72',
'[&>svg]:w-full [&>svg]:h-full [&>svg]:block',
 opts?.recommended ?'ring-1 ring-primary/20' :''
 )}
 // svgIcon is generated by admin tool; render as inline svg
 dangerouslySetInnerHTML={{ __html: layout.svgIcon as string }}
 />
 ) : hasNamedIcon ? (
 <div className={cn(
'h-11 w-11 flex items-center justify-center text-primary/72',
 opts?.recommended ?'ring-1 ring-primary/20' :''
 )}>
 {renderLucideLayoutIcon(layout.svgIcon, {
 className:'h-11 w-11 stroke-[1.75]',
 }) ?? (
 renderMaterialIconBridge(layout.svgIcon, 'h-11 w-11 stroke-[1.75]')
 )}
 </div>
 ) : (
 <CompositionPreviewThumbnail
 data={preview}
 className={cn('w-full h-full shadow-sm', opts?.recommended ?'ring-1 ring-primary/20' :'')}
 />
 )}
 </div>

 <div className={cn(
'flex flex-1 flex-col gap-1 border-t px-2 py-2 transition-colors',
 isSelected
 ?'border-primary/18 bg-primary/[0.055]'
 :'border-border/40 bg-background/72'
 )}>
 <span className={cn(
'block truncate text-center text-[clamp(0.82rem,0.78rem+0.08vw,0.88rem)] font-semibold leading-tight transition-colors duration-200',
 isSelected
 ?'text-primary/90'
 :'text-foreground/86 group-hover:text-foreground/92'
 )}>
 {title}
 </span>
 {isAdmin && (
 <span className="text-[8px] block text-center leading-none text-muted-foreground">
 {(() => {
 const stats = getLayoutRatingStats(layout.id, layoutRatings)
 return `${stats.totalPoints} pts`
 })()}
 </span>
 )}
 <span className={cn(
'block text-center text-[clamp(0.74rem,0.7rem+0.08vw,0.8rem)] leading-snug opacity-90',
 isSelected ?'text-primary/72' :'text-muted-foreground/82'
 )}>
 {description}
 </span>
 </div>
 </motion.button>
 )
 })}
 </div>
 )

 const hasAdvancedSections = Boolean(recommendedLayouts && allLayouts)

 return (
 <div className="space-y-4">
 {hasAdvancedSections ? (
 <>
 <div className="space-y-2">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
 {t('layoutSelector.recommendedForIntent', { defaultValue:'Recommended for your intent' })}
 </p>
 <div className="rounded-xl border border-primary/20 bg-primary/5 p-2">
 {renderGrid(recommendedLayouts || [], { recommended: true })}
 </div>
 </div>
 <div className="space-y-2">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 {t('layoutSelector.allDesigns', { defaultValue:'All layouts' })}
 </p>
 <div className="rounded-xl border border-border/60 bg-muted/50 p-2">
 {renderGrid(allLayouts || [])}
 </div>
 </div>
 </>
 ) : (
 renderGrid(availableLayouts)
 )}
 </div>
 )
}
