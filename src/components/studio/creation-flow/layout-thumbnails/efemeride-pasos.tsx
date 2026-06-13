import { Box } from 'lucide-react';
import { IconCheck, IconCalendar } from '@/components/ui/icons';

export function EfemerideHeroLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/35 flex items-center justify-center">
                <div className="w-5 h-5 bg-primary/45 rounded-full" />
                <div className="absolute -bottom-1 w-7 h-1 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function EfemeridePartyLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-8 h-4 bg-primary/35 rounded-md" />
            <div className="absolute top-1 left-2 w-2 h-2 bg-primary/45 rounded-full" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary/30 rounded-full" />
            <div className="absolute bottom-1 left-3 w-1.5 h-1.5 bg-primary/25 rounded-full" />
        </div>
    );
}

export function EfemerideHistoryLayout() {
    return (
        <div className="w-full h-full flex items-center p-1">
            <div className="relative w-4 h-full">
                <div className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-0.5 bg-primary/25" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/45 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col gap-1 pl-1">
                <div className="h-1 w-full bg-primary/25 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function EfemerideSeasonalLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-8 h-8 bg-primary/25 rounded-full" />
            <div className="absolute top-2 left-3 w-3 h-6 bg-primary/35 rounded-full rotate-45" />
            <div className="absolute bottom-2 right-3 w-3 h-6 bg-primary/30 rounded-full -rotate-45" />
        </div>
    );
}

export function EfemerideBanderaLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-2 h-10 bg-primary/35 rounded-full" />
            <div className="absolute left-3 top-3 w-7 h-4 bg-primary/30 rounded-sm" />
        </div>
    );
}

export function EfemerideReligiosoLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-4 h-10 bg-primary/35 rounded-sm">
                <div className="absolute left-1/2 -translate-x-1/2 top-3 w-8 h-2 bg-primary/35 rounded-sm" />
            </div>
        </div>
    );
}

export function EfemerideCountdownLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-3 h-5 bg-primary/45 rounded-sm" />
            <div className="w-3 h-5 bg-primary/35 rounded-sm" />
            <div className="w-1.5 h-1.5 bg-primary/50 rounded-full" />
            <div className="w-3 h-5 bg-primary/35 rounded-sm" />
            <div className="w-3 h-5 bg-primary/45 rounded-sm" />
        </div>
    );
}

export function EfemerideMensajeLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-10 h-8 bg-primary/25 rounded-md">
                <div className="mt-2 mx-2 h-1 bg-primary/35 rounded-full" />
                <div className="mt-1 mx-2 h-1 bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function EfemerideFlagLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-1 h-5 bg-primary/50" />
            <div className="w-4 h-3 bg-primary/30 -ml-px" />
        </div>
    );
}

export function EfemerideRibbonLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-2 bg-primary/40 rounded-full" />
        </div>
    );
}

export function EfemerideVintageLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-6 border-2 border-primary/30 rounded-sm flex items-center justify-center">
                <div className="text-primary/50 text-[8px] font-serif">19</div>
            </div>
        </div>
    );
}

export function EfemerideModernLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
            <div className="text-primary/60 text-sm font-bold">24</div>
            <div className="w-[50%] h-0.5 bg-primary/25 rounded-full" />
        </div>
    );
}

export function EfemerideCollageLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1">
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
        </div>
    );
}

export function EfemerideStampLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-5 h-5 border-2 border-dashed border-primary/40 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-primary/30 rounded-full" />
            </div>
        </div>
    );
}

export function EfemerideMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <IconCalendar className="w-10 h-10 text-primary/50" />
            <div className="w-[60%] h-1 bg-primary/25 rounded-full" />
        </div>
    );
}

export function PasosZigzagLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute left-1 top-2 w-4 h-4 rounded-full bg-primary/50" />
            <div className="absolute right-1 top-6 w-4 h-4 rounded-full bg-primary/40" />
            <div className="absolute left-2 bottom-2 w-4 h-4 rounded-full bg-primary/30" />
            <div className="absolute left-3 top-5 w-10 h-0.5 bg-primary/30 rotate-12" />
            <div className="absolute left-3 top-8 w-10 h-0.5 bg-primary/25 -rotate-12" />
        </div>
    );
}

export function PasosCarouselLayout() {
    return (
        <div className="w-full h-full relative p-1 flex items-center justify-center">
            <div className="absolute left-1 w-8 h-10 rounded-md bg-primary/20 border border-primary/25" />
            <div className="absolute right-1 w-8 h-10 rounded-md bg-primary/20 border border-primary/25" />
            <div className="relative w-10 h-12 rounded-md bg-primary/35 border border-primary/30 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-primary/60 text-primary-foreground text-[8px] font-bold flex items-center justify-center">2</div>
            </div>
        </div>
    );
}

export function PasosSplitGuideLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-[55%] rounded-md bg-primary/25 border border-primary/30 relative">
                <div className="absolute bottom-1 left-1 w-6 h-1 bg-primary/40 rounded-full" />
            </div>
            <div className="w-[45%] flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary/50 flex items-center justify-center text-[6px] text-white font-bold">1</div>
                    <div className="h-1 flex-1 bg-primary/25 rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary/35 flex items-center justify-center text-[6px] text-white font-bold">2</div>
                    <div className="h-1 flex-1 bg-primary/20 rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary/25 flex items-center justify-center text-[6px] text-primary/60 font-bold">3</div>
                    <div className="h-1 flex-1 bg-primary/15 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function PasosFloating3DLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="relative w-8 h-8 rounded-full bg-primary/35 shadow-sm flex items-center justify-center">
                <div className="text-primary-foreground text-[9px] font-bold">1</div>
            </div>
            <div className="relative -mt-2 w-10 h-10 rounded-full bg-primary/50 shadow-md flex items-center justify-center">
                <div className="text-primary-foreground text-[10px] font-bold">2</div>
            </div>
            <div className="relative w-8 h-8 rounded-full bg-primary/30 shadow-sm flex items-center justify-center">
                <div className="text-primary-foreground text-[9px] font-bold">3</div>
            </div>
        </div>
    );
}

export function PasosBlueprintLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md border border-dashed border-primary/30" />
            <div className="absolute left-2 top-2 w-10 h-6 border-2 border-primary/35 rounded-sm" />
            <div className="absolute left-4 top-4 w-6 h-2 bg-primary/20 rounded-full" />
            <div className="absolute right-2 bottom-2 w-5 h-5 border-2 border-primary/35 rounded-full" />
            <div className="absolute right-6 bottom-6 w-6 h-0.5 bg-primary/30" />
            <div className="absolute right-6 bottom-4 w-0.5 h-4 bg-primary/30" />
        </div>
    );
}

export function PasosTimelineLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-6 h-full">
                <div className="absolute left-1/2 -translate-x-1/2 inset-y-1 w-0.5 bg-primary/25" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/50" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/40" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/30" />
            </div>
            <div className="flex-1 flex flex-col gap-1 pl-1">
                <div className="h-1 w-[80%] bg-primary/30 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/20 rounded-full" />
                <div className="h-1 w-[60%] bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function PasosRecipeLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-[55%] rounded-md bg-primary/30 border border-primary/30 relative">
                <div className="absolute bottom-1 left-1 w-7 h-1 bg-primary/50 rounded-full" />
            </div>
            <div className="w-[45%] flex flex-col justify-between">
                <div className="w-full h-3 rounded-md bg-primary/20" />
                <div className="flex flex-col gap-1">
                    <div className="h-1 w-full bg-primary/25 rounded-full" />
                    <div className="h-1 w-[80%] bg-primary/20 rounded-full" />
                    <div className="h-1 w-[60%] bg-primary/15 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function PasosBeforeAfterLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-8 h-10 bg-primary/20 rounded-md border border-primary/25" />
            <div className="w-3 h-3 rounded-full bg-primary/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
            </div>
            <div className="w-8 h-10 bg-primary/45 rounded-md border border-primary/35" />
        </div>
    );
}

export function PasosCirclesLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full border-2 border-primary/30">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/45" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/35" />
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/30" />
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/25" />
            </div>
        </div>
    );
}

export function PasosHandsLayout() {
    return (
        <div className="w-full h-full relative p-1 flex items-center justify-center">
            <div className="absolute left-2 w-8 h-6 rounded-full bg-primary/30 rotate-6" />
            <div className="absolute right-2 w-8 h-6 rounded-full bg-primary/40 -rotate-6" />
            <div className="w-4 h-4 rounded-full bg-primary/60" />
        </div>
    );
}

export function PasosQuickLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/50" />
                <div className="h-1 flex-1 bg-primary/35 rounded-full" />
                <div className="w-4 h-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div className="h-1 flex-1 bg-primary/25 rounded-full" />
                <div className="w-4 h-1 bg-primary/20 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <div className="h-1 flex-1 bg-primary/20 rounded-full" />
                <div className="w-4 h-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function PasosVerticalLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className="w-px h-1 bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/40" />
            <div className="w-px h-1 bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/30" />
        </div>
    );
}

export function PasosHorizontalLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className="w-2 h-px bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/40" />
            <div className="w-2 h-px bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/30" />
        </div>
    );
}

export function PasosCircularLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary/60" />
        </div>
    );
}

export function PasosCardsLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-3 h-4 bg-primary/40 rounded-sm flex items-center justify-center">
                <div className="text-white text-[6px]">1</div>
            </div>
            <div className="w-3 h-4 bg-primary/30 rounded-sm flex items-center justify-center">
                <div className="text-white text-[6px]">2</div>
            </div>
            <div className="w-3 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                <div className="text-primary/50 text-[6px]">3</div>
            </div>
        </div>
    );
}

export function PasosChecklistLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 border border-primary/40 rounded-sm flex items-center justify-center">
                    <div className="text-primary/60 text-[5px]">✓</div>
                </div>
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 border border-primary/30 rounded-sm" />
                <div className="h-0.5 flex-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function PasosFlowchartLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="flex flex-col items-center">
                <div className="w-3 h-2 bg-primary/40 rounded-sm" />
                <div className="w-px h-1 bg-primary/30" />
                <div className="flex gap-2">
                    <div className="w-2 h-2 bg-primary/30 rounded-sm" />
                    <div className="w-2 h-2 bg-primary/30 rounded-sm" />
                </div>
            </div>
        </div>
    );
}

export function PasosIconsLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-2 p-1">
            <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center">
                <Box className="w-6 h-6 text-primary/70" />
            </div>
            <div className="text-primary/30 text-lg">→</div>
            <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
                <IconCheck className="w-6 h-6 text-primary/70" />
            </div>
        </div>
    );
}

export function PasosNumberedLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/50 flex items-center justify-center text-white text-[6px]">1</div>
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/35 flex items-center justify-center text-white text-[6px]">2</div>
                <div className="h-0.5 flex-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}
