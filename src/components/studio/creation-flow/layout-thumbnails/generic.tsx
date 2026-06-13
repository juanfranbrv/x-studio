import { Box, BookOpen } from 'lucide-react';
import { IconSparkles } from '@/components/ui/icons';

export function FreeLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Dice 1 (Back Left) - Cara 3 */}
                <div className="absolute left-0 top-0 w-8 h-8 z-0 opacity-90">
                    {/* Top Face */}
                    <div className="absolute -top-[8px] left-0 w-8 h-[8px] bg-primary/20 transform skew-x-[-45deg] origin-bottom-left" />
                    {/* Right Face */}
                    <div className="absolute top-0 -right-[8px] w-[8px] h-8 bg-primary/40 transform skew-y-[-45deg] origin-top-left" />
                    {/* Front Face */}
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="relative w-full h-full">
                            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-primary/60" />
                            <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-primary/60" />
                            <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary/60" />
                        </div>
                    </div>
                </div>

                {/* Dice 2 (Front Right) - Cara 5 */}
                <div className="absolute right-2 bottom-2 w-8 h-8 z-10">
                    {/* Top Face */}
                    <div className="absolute -top-[8px] left-0 w-8 h-[8px] bg-primary/30 transform skew-x-[-45deg] origin-bottom-left" />
                    {/* Right Face */}
                    <div className="absolute top-0 -right-[8px] w-[8px] h-8 bg-primary/60 transform skew-y-[-45deg] origin-top-left" />
                    {/* Front Face */}
                    <div className="absolute inset-0 bg-primary/30 shadow-sm">
                        <div className="relative w-full h-full">
                            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-primary/80" />
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary/80" />
                            <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-primary/80" />
                            <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-primary/80" />
                            <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary/80" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CleanLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex-1 rounded-sm border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-white relative overflow-hidden">
                <div className="absolute right-1 top-1 w-2.5 h-2.5 rounded-full bg-primary/35" />
                <div className="absolute left-1 bottom-1 w-6 h-1 bg-white/70 rounded-full" />
                <div className="absolute inset-0 border border-dashed border-primary/20 rounded-sm" />
            </div>
            <div className="h-3 flex flex-col gap-0.5">
                <div className="h-1 w-full bg-primary/35 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function FullBleedLayout() {
    return (
        <div className="w-full h-full relative overflow-hidden rounded-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/45 via-primary/25 to-primary/5" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/30" />
            <div className="absolute bottom-1 left-1 right-1 h-3 rounded-sm border border-white/70 bg-white/70 backdrop-blur-sm" />
            <div className="absolute top-1 left-1 w-4 h-4 rounded-sm border border-white/70 bg-white/40" />
        </div>
    );
}

export function FrameLayout() {
    return (
        <div className="w-full h-full p-1">
            <div className="w-full h-full rounded-sm border-2 border-primary/40 p-1">
                <div className="w-full h-full rounded-sm border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-white relative">
                    <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-primary/60 rounded-sm" />
                    <div className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-primary/35 rounded-sm" />
                    <div className="absolute inset-x-1 bottom-1 h-1 bg-white/70 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function BasicEditorialColumnsLayout() {
    return (
        <div className="w-full h-full p-1 flex gap-1">
            <div className="w-[62%] h-full rounded-sm bg-primary/25 relative">
                <div className="absolute top-1 left-1 right-2 h-1 bg-primary/45 rounded-full" />
                <div className="absolute top-3 left-1 right-3 h-1 bg-primary/30 rounded-full" />
                <div className="absolute top-5 left-1 right-4 h-1 bg-primary/20 rounded-full" />
            </div>
            <div className="w-[38%] h-full rounded-sm bg-primary/12 flex flex-col gap-1 p-1">
                <div className="h-1.5 rounded-full bg-primary/35" />
                <div className="h-1.5 rounded-full bg-primary/25" />
                <div className="h-1.5 rounded-full bg-primary/20" />
            </div>
        </div>
    );
}

export function BasicMosaicFlowLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
            <div className="col-span-2 row-span-2 rounded-sm bg-primary/35" />
            <div className="rounded-sm bg-primary/20" />
            <div className="rounded-sm bg-primary/25" />
            <div className="col-span-2 rounded-sm bg-primary/15" />
            <div className="rounded-sm bg-primary/28" />
            <div className="rounded-sm bg-primary/18" />
        </div>
    );
}

export function BasicSpotlightRadialLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1 relative">
            <div className="absolute inset-1 rounded-full bg-primary/10" />
            <div className="absolute inset-[22%] rounded-full bg-primary/18" />
            <div className="absolute inset-[38%] rounded-full bg-primary/38" />
            <div className="absolute top-2 left-2 h-1 w-5 bg-primary/28 rounded-full" />
            <div className="absolute bottom-2 right-2 h-1 w-4 bg-primary/22 rounded-full" />
        </div>
    );
}

export function BasicStackedCardsLayout() {
    return (
        <div className="w-full h-full p-1 relative">
            <div className="absolute inset-[22%] rounded-sm bg-primary/15 rotate-[-6deg]" />
            <div className="absolute inset-[16%] rounded-sm bg-primary/22 rotate-[3deg]" />
            <div className="absolute inset-[10%] rounded-sm bg-primary/35">
                <div className="absolute top-2 left-2 right-3 h-1 bg-primary/45 rounded-full" />
                <div className="absolute top-4 left-2 right-5 h-1 bg-primary/30 rounded-full" />
            </div>
        </div>
    );
}

export function BasicDiagonalEnergyLayout() {
    return (
        <div className="w-full h-full p-1 relative overflow-hidden rounded-sm">
            <div className="absolute -left-2 top-1 h-2 w-16 bg-primary/35 rotate-[-22deg] rounded-full" />
            <div className="absolute -left-1 top-4 h-2 w-14 bg-primary/22 rotate-[-22deg] rounded-full" />
            <div className="absolute left-4 bottom-2 h-2 w-12 bg-primary/18 rotate-[-22deg] rounded-full" />
            <div className="absolute right-1 top-1 w-3 h-3 rounded-full bg-primary/55" />
            <div className="absolute right-2 bottom-2 w-2 h-2 rounded-full bg-primary/30" />
        </div>
    );
}

export function BigNumberLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="text-primary/80 text-3xl font-black">73%</div>
            <div className="h-1 w-[70%] bg-primary/20 rounded-full" />
        </div>
    );
}

export function ComparisonLayout() {
    return (
        <div className="w-full h-full flex items-end justify-center gap-2 p-2 pb-3">
            <div className="w-[30%] h-[40%] bg-primary/30 rounded-sm" />
            <div className="w-[30%] h-[70%] bg-primary/60 rounded-sm" />
        </div>
    );
}

export function ProcessLayout() {
    return (
        <div className="w-full h-full flex items-center justify-around p-2">
            <div className="flex flex-col items-center gap-0.5">
                <div className="w-3 h-3 rounded-full bg-primary/80 text-[6px] text-white flex items-center justify-center font-bold">1</div>
            </div>
            <div className="h-px w-2 bg-primary/30" />
            <div className="flex flex-col items-center gap-0.5">
                <div className="w-3 h-3 rounded-full bg-primary/50 text-[6px] text-white flex items-center justify-center font-bold">2</div>
            </div>
            <div className="h-px w-2 bg-primary/30" />
            <div className="flex flex-col items-center gap-0.5">
                <div className="w-3 h-3 rounded-full bg-primary/30 text-[6px] text-primary/60 flex items-center justify-center font-bold">3</div>
            </div>
        </div>
    );
}

export function InfoGridLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-1">
            <div className="bg-primary/20 rounded-sm flex items-center justify-center text-[8px] text-primary/70 font-bold">42</div>
            <div className="bg-primary/35 rounded-sm flex items-center justify-center text-[8px] text-primary/80 font-bold">18</div>
            <div className="bg-primary/35 rounded-sm flex items-center justify-center text-[8px] text-primary/80 font-bold">7K</div>
            <div className="bg-primary/20 rounded-sm flex items-center justify-center text-[8px] text-primary/70 font-bold">99</div>
        </div>
    );
}

export function MetricLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
            <div className="text-primary/70 text-sm font-mono font-bold">1,234</div>
            <div className="flex items-center gap-0.5">
                <div className="text-green-500/80 text-[8px]">▲</div>
                <div className="text-[7px] text-primary/50">+12%</div>
            </div>
        </div>
    );
}

export function CircularLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary/70 border-r-primary/70 flex items-center justify-center">
                <span className="text-[7px] font-bold text-primary/70">67%</span>
            </div>
        </div>
    );
}

export function DashboardLayout() {
    return (
        <div className="w-full h-full p-1.5">
            <div className="w-full h-full rounded border border-primary/20 bg-primary/5 p-1 flex flex-col gap-1">
                <div className="h-1 w-[50%] bg-primary/40 rounded-full" />
                <div className="text-[10px] font-bold text-primary/70">847</div>
                <div className="flex-1 flex items-end gap-0.5">
                    <div className="w-1 h-[30%] bg-primary/25 rounded-t-sm" />
                    <div className="w-1 h-[50%] bg-primary/40 rounded-t-sm" />
                    <div className="w-1 h-[40%] bg-primary/25 rounded-t-sm" />
                    <div className="w-1 h-[70%] bg-primary/60 rounded-t-sm" />
                </div>
            </div>
        </div>
    );
}

export function BarChartLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-end gap-1 p-2 pb-3">
            <div className="flex items-end gap-1 h-full">
                <div className="w-[20%] h-[30%] bg-primary/25 rounded-t-sm" />
                <div className="w-[20%] h-[60%] bg-primary/40 rounded-t-sm" />
                <div className="w-[20%] h-[80%] bg-primary/65 rounded-t-sm" />
                <div className="w-[20%] h-[50%] bg-primary/40 rounded-t-sm" />
            </div>
        </div>
    );
}

export function IconLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary/70">
                <IconSparkles className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-bold text-primary/70">+50%</div>
        </div>
    );
}

export function TimelineLayout() {
    return (
        <div className="w-full h-full flex items-center p-2">
            <div className="w-full flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary/70" />
                <div className="flex-1 h-0.5 bg-primary/40" />
                <div className="w-2 h-2 rounded-full bg-primary/45" />
                <div className="flex-1 h-0.5 bg-primary/25" />
                <div className="w-2 h-2 rounded-full bg-primary/25" />
            </div>
        </div>
    );
}

export function MapLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div className="w-full h-full rounded bg-primary/10 relative overflow-hidden">
                <div className="absolute top-1 left-1 w-3 h-2 bg-primary/35 rounded-sm" />
                <div className="absolute top-2 right-2 w-2 h-3 bg-primary/55 rounded-sm" />
                <div className="absolute bottom-1 left-2 w-4 h-2 bg-primary/25 rounded-sm" />
                <div className="absolute bottom-2 right-1 w-1.5 h-1.5 rounded-full bg-red-400/70" />
            </div>
        </div>
    );
}

export function SplitLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-[40%] flex flex-col gap-1 justify-center">
                <div className="h-1.5 w-full bg-primary/40 rounded-full" />
                <div className="h-1.5 w-[70%] bg-primary/25 rounded-full" />
            </div>
            <div className="w-[60%] bg-primary/25 rounded-sm" />
        </div>
    );
}

export function SpotlightLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
            <div className="w-[50%] aspect-square bg-primary/35 rounded-full" />
            <div className="h-1 w-[60%] bg-primary/25 rounded-full" />
        </div>
    );
}

export function TestimonialLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
            <div className="text-primary/40 text-lg leading-none">&quot;</div>
            <div className="h-1 w-[80%] bg-primary/25 rounded-full" />
            <div className="h-1 w-[60%] bg-primary/20 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-primary/35 mt-1" />
        </div>
    );
}

export function DefaultLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-2 p-1.5">
            <div className="flex-1 bg-primary/10 rounded-md border-2 border-dashed border-primary/25" />
            <div className="h-2 w-[80%] mx-auto bg-primary/25 rounded-full" />
        </div>
    );
}

export function BentoGridLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5 p-1">
            <div className="col-span-2 bg-primary/40 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="col-span-2 bg-primary/35 rounded-sm" />
        </div>
    );
}

export function ListLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1.5">
            {[0.7, 0.5, 0.6].map((w, i) => (
                <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-primary/50" />
                    <div className="h-1" style={{ width: `${w * 100}%` }}>
                        <div className="h-full bg-primary/25 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function WorkshopLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/50 rounded-sm flex items-center justify-center">
                <Box className="w-4 h-4 text-primary/80" />
            </div>
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
        </div>
    );
}

export function EcosystemLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div className="relative">
                <div className="w-4 h-4 rounded-full bg-primary/60" />
                <div className="absolute -top-2 -left-2 w-2 h-2 rounded-full bg-primary/30" />
                <div className="absolute -top-2 -right-2 w-2 h-2 rounded-full bg-primary/30" />
                <div className="absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-primary/30" />
                <div className="absolute -bottom-2 -right-2 w-2 h-2 rounded-full bg-primary/30" />
            </div>
        </div>
    );
}

export function ImmersiveLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-full rounded-sm bg-gradient-to-b from-primary/10 via-primary/30 to-primary/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary/70" />
            </div>
        </div>
    );
}

export function InteractionLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-2 p-2">
            <div className="w-4 h-6 rounded-full bg-primary/40" />
            <div className="w-4 h-6 rounded-full bg-primary/30" />
        </div>
    );
}

export function ExplosionLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative">
                <div className="w-3 h-3 rounded-full bg-primary/70" />
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/40" />
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/40" />
                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/40" />
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/40" />
                <div className="absolute -top-1 -left-1 w-1 h-1 rounded-full bg-primary/25" />
                <div className="absolute -top-1 -right-1 w-1 h-1 rounded-full bg-primary/25" />
                <div className="absolute -bottom-1 -left-1 w-1 h-1 rounded-full bg-primary/25" />
                <div className="absolute -bottom-1 -right-1 w-1 h-1 rounded-full bg-primary/25" />
            </div>
        </div>
    );
}

export function DictionaryLayout() {
    return (
        <div className="w-full h-full flex flex-col p-2 gap-2">
            <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary/60 shrink-0" />
                <div className="text-primary/80 text-base font-serif font-bold">Abc</div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
                <div className="h-1 w-full bg-primary/20 rounded-full" />
                <div className="h-1 w-[80%] bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function BigTypoLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-primary/70 text-4xl font-black tracking-tighter">Aa</div>
        </div>
    );
}

export function MindMapLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative">
                <div className="w-4 h-4 rounded-full bg-primary/60 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary/90" />
                </div>
                <div className="absolute top-1/2 -left-3 w-2.5 h-px bg-primary/40" />
                <div className="absolute top-1/2 -right-3 w-2.5 h-px bg-primary/40" />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-2 w-px bg-primary/40" />
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/30" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/30" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/30" />
            </div>
        </div>
    );
}

export function EncyclopediaLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 gap-1 p-1.5">
            <div className="flex flex-col gap-0.5">
                <div className="h-0.5 w-full bg-primary/25 rounded-full" />
                <div className="h-0.5 w-full bg-primary/20 rounded-full" />
                <div className="h-0.5 w-[70%] bg-primary/15 rounded-full" />
            </div>
            <div className="bg-primary/15 rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 border border-primary/40 rounded-sm" />
            </div>
        </div>
    );
}

export function StickerLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-200/30 p-1">
            <div className="w-6 h-6 bg-primary/70 rounded-lg rotate-3 flex items-center justify-center shadow-sm">
                <span className="text-white text-[8px] font-black">TAG</span>
            </div>
        </div>
    );
}

export function CodeBlockLayout() {
    return (
        <div className="w-full h-full bg-primary/10 rounded-sm p-1.5 flex flex-col gap-0.5">
            <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-primary/40" />
                <div className="w-1 h-1 rounded-full bg-primary/30" />
                <div className="w-1 h-1 rounded-full bg-primary/20" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 mt-1">
                <div className="h-0.5 w-[70%] bg-primary/50 rounded-full" />
                <div className="h-0.5 w-[50%] bg-primary/35 rounded-full" />
                <div className="h-0.5 w-[60%] bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function NeonLayout() {
    return (
        <div className="w-full h-full bg-primary/10 rounded-sm flex items-center justify-center border border-dashed border-primary/30">
            <div className="text-primary/80 text-sm font-bold">
                Neo
            </div>
        </div>
    );
}

export function FlashcardLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-full bg-white border border-primary/20 rounded-sm shadow-sm flex flex-col">
                <div className="flex-1 flex items-center justify-center border-b border-dashed border-primary/20">
                    <span className="text-primary/70 text-[8px] font-bold">?</span>
                </div>
                <div className="h-[40%] bg-primary/5 flex items-center justify-center">
                    <div className="w-[60%] h-0.5 bg-primary/20 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function IllustratedLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-5 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary/50" />
            </div>
            <div className="w-[70%] h-0.5 bg-primary/30 rounded-full" />
        </div>
    );
}

export function EmojiLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <div className="text-primary/70 text-lg font-bold">:)</div>
            <div className="w-[50%] h-0.5 bg-primary/25 rounded-full" />
        </div>
    );
}
