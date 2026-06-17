'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { resolveCarouselCompositionIcon } from '@/lib/carousel-composition-icon'
import { renderMaterialIconBridge } from '@/components/ui/material-icon-bridge'

type CarouselComposition = {
 id: string
 name: string
 description: string
 layoutPrompt?: string
 icon?: string
 iconPrompt?: string
 scope: 'global' | 'narrative'
}

interface CarouselCompositionSelectorProps {
 compositions: CarouselComposition[]
 selectedId: string
 onSelect: (id: string) => void
}

function renderCompositionIcon(iconName: string) {
 const trimmed = iconName.trim()
 if (!trimmed) return null

 if (trimmed.startsWith('<svg')) {
   return (
     <div
       className="h-11 w-11 overflow-hidden text-primary/72 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
       dangerouslySetInnerHTML={{ __html: trimmed }}
     />
   )
 }

 return (
   <div className="flex h-11 w-11 items-center justify-center text-primary/72">
     {renderMaterialIconBridge(trimmed, 'h-11 w-11 stroke-[1.75]')}
   </div>
 )
}

export function CarouselCompositionSelector({
 compositions,
 selectedId,
 onSelect
}: CarouselCompositionSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {compositions.map((composition) => {
          const isSelected = selectedId === composition.id
          const resolvedIcon = resolveCarouselCompositionIcon(composition)

          return (
            <motion.button
              key={composition.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(composition.id)}
              aria-label={`${composition.name}: ${composition.description}`}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-[1rem] border text-left transition-all duration-300',
                isSelected
                  ? 'border-primary/32 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
                  : 'border-border/55 bg-background/55 hover:border-border/80 hover:bg-background/92 hover:shadow-[0_16px_32px_-28px_rgba(15,23,42,0.2)]'
              )}
              title={composition.description}
            >
              <div
                className={cn(
                  'flex w-full items-center justify-center px-1 py-2.5 transition-colors',
                  isSelected ? 'bg-primary/[0.055]' : 'bg-background/40 group-hover:bg-background/78'
                )}
              >
                {renderCompositionIcon(resolvedIcon)}
              </div>

              <div
                className={cn(
                  'flex flex-1 flex-col gap-1 border-t px-2 py-2 transition-colors',
                  isSelected ? 'border-primary/18 bg-primary/[0.055]' : 'border-border/40 bg-background/72'
                )}
              >
                <span
                  className={cn(
                    'block truncate text-center text-[clamp(0.82rem,0.78rem+0.08vw,0.88rem)] font-semibold leading-tight transition-colors duration-200',
                    isSelected ? 'text-primary/90' : 'text-foreground/86 group-hover:text-foreground/92'
                  )}
                >
                  {composition.name}
                </span>
                <span
                  className={cn(
                    'line-clamp-3 text-center text-[clamp(0.74rem,0.7rem+0.08vw,0.8rem)] leading-snug opacity-90',
                    isSelected ? 'text-primary/72' : 'text-muted-foreground/82'
                  )}
                >
                  {composition.description}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
