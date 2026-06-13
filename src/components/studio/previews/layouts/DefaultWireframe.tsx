import { LayoutProps } from './types'
import { cn } from '@/lib/utils'

type DefaultWireframeProps = LayoutProps

export function DefaultWireframe({ image, texts, brandColors, isGhost }: DefaultWireframeProps) {
    const mainColor = isGhost ? '#f4f4f5' : (brandColors[0] || '#000000')
    const headline = texts['headline']
    const cta = texts['cta'] || 'DESCUBRIR MAS'

    return (
        <div className="w-full h-full relative p-6 flex flex-col items-center justify-center text-center bg-white/50">
            {/* Dynamic Content Center */}
            <div className="relative z-10 space-y-6 w-full flex flex-col items-center">
                {image ? (
                    <div className="w-[80%] aspect-video bg-zinc-100 rounded-lg overflow-hidden shadow-sm">
                        <img src={image} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                ) : (
                    isGhost ? (
                        <div className={cn(
                            "w-[80%] aspect-video rounded-lg border-2 border-dashed flex items-center justify-center",
                            "bg-zinc-50 border-zinc-200"
                        )} />
                    ) : null
                )}

                <div className="space-y-4 w-full flex flex-col items-center">
                    {isGhost ? (
                        <div className="space-y-2 w-full flex flex-col items-center">
                            <div className="h-6 w-[70%] rounded bg-zinc-200" />
                            <div className="h-6 w-[50%] rounded bg-zinc-200" />
                        </div>
                    ) : (
                        headline ? (
                            <h2 className="text-2xl font-black text-black leading-tight border-b-2 border-transparent inline-block pb-1"
                                style={{ borderColor: mainColor }}
                            >
                                {headline}
                            </h2>
                        ) : null
                    )}

                    {isGhost ? (
                        <div className="h-8 w-32 rounded-full bg-zinc-300 mt-2" />
                    ) : (
                        texts['cta'] && (
                            <div className="pt-2">
                                <span className="inline-block px-4 py-2 bg-black text-white text-xs font-bold rounded-full">
                                    {cta}
                                </span>
                            </div>
                        )
                    )}

                    {!isGhost && (
                        <div className="pt-4 space-y-2">
                            {Object.entries(texts)
                                .filter(([key]) => key !== 'headline' && key !== 'cta' && texts[key])
                                .map(([key, value]) => (
                                    <div key={key} className="text-sm font-medium text-zinc-600 border border-dashed border-zinc-300 rounded px-2 py-1 inline-block mx-1">
                                        <span className="text-[10px] uppercase text-zinc-400 mr-2 block text-left">{key.replace('_', ' ')}:</span>
                                        {value}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
