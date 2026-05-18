'use client'

import type { AcademyContentBlock } from '@/lib/academy-types'
import { cn } from '@/lib/utils'
import { ACADEMY_BODY_CLASS, ACADEMY_MUTED_SURFACE_CLASS } from './academyStyles'

interface AcademyRichContentProps {
    blocks: AcademyContentBlock[]
}

export function AcademyRichContent({ blocks }: AcademyRichContentProps) {
    return (
        <div className="space-y-6">
            {blocks.map((block, index) => {
                if (block.type === 'heading') {
                    return (
                        <h2
                            key={`${block.type}-${index}`}
                            className="pt-2 text-[clamp(1.28rem,1.18rem+0.45vw,1.7rem)] font-semibold tracking-[-0.03em] text-foreground"
                        >
                            {block.content}
                        </h2>
                    )
                }

                if (block.type === 'paragraph') {
                    return (
                        <p key={`${block.type}-${index}`} className={cn(ACADEMY_BODY_CLASS, 'max-w-[68ch]')}>
                            {block.content}
                        </p>
                    )
                }

                if (block.type === 'callout') {
                    return (
                        <div key={`${block.type}-${index}`} className={cn('p-5', ACADEMY_MUTED_SURFACE_CLASS)}>
                            <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-foreground">
                                {block.title}
                            </h3>
                            <p className={cn(ACADEMY_BODY_CLASS, 'mt-3')}>{block.content}</p>
                        </div>
                    )
                }

                return (
                    <figure key={`${block.type}-${index}`} className="space-y-3">
                        <img
                            src={block.src}
                            alt={block.alt}
                            className="aspect-[16/10] w-full rounded-[1.5rem] border border-border/60 object-cover shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)]"
                        />
                        {block.caption ? (
                            <figcaption className="text-sm leading-6 text-muted-foreground">
                                {block.caption}
                            </figcaption>
                        ) : null}
                    </figure>
                )
            })}
        </div>
    )
}
