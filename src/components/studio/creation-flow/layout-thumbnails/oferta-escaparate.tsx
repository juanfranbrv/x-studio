import { Crown, Zap } from 'lucide-react';

export function OfertaImpactoLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/45 rounded-full" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary/30 rounded-full" />
                <div className="text-primary/80 text-xl font-black leading-none">%</div>
            </div>
        </div>
    );
}

export function OfertaPriceLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="relative w-12 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="text-primary/50 text-[7px] line-through">99</div>
                <div className="absolute inset-x-1 h-0.5 bg-primary/35 rotate-6" />
            </div>
            <div className="text-primary/80 text-base font-black">49</div>
            <div className="w-8 h-1 bg-primary/25 rounded-full" />
        </div>
    );
}

export function OfertaPrecioLayout() {
    return <OfertaPriceLayout />;
}

export function OfertaFlashLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md bg-primary/15 border border-primary/25" />
            <div className="absolute left-2 top-2 w-8 h-0.5 bg-primary/40 rotate-[-20deg]" />
            <div className="absolute left-3 top-5 w-8 h-0.5 bg-primary/30 rotate-[-20deg]" />
            <div className="absolute right-3 bottom-3 w-8 h-0.5 bg-primary/30 rotate-[-20deg]" />
            <div className="absolute right-2 bottom-6 w-8 h-0.5 bg-primary/40 rotate-[-20deg]" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary/70 fill-primary/20" />
            </div>
        </div>
    );
}

export function OfertaCuponLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-5 border-2 border-dashed border-primary/45 rounded-md flex items-center justify-center relative">
                <div className="absolute -left-1 w-2 h-2 rounded-full bg-background border-2 border-primary/45" />
                <div className="absolute -right-1 w-2 h-2 rounded-full bg-background border-2 border-primary/45" />
                <div className="text-primary/70 text-[7px] font-mono tracking-widest">CODE</div>
            </div>
        </div>
    );
}

export function OfertaStickerLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-9 h-9">
                <div className="absolute inset-0 bg-primary/45 rounded-full" />
                <div className="absolute inset-1 border-2 border-primary/60 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center -rotate-12">
                    <div className="text-primary-foreground text-[7px] font-bold">-30%</div>
                </div>
            </div>
        </div>
    );
}

export function OfertaMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-12 h-6 rounded-md border border-primary/25 flex items-center justify-center">
                <div className="text-primary/70 text-sm font-semibold tracking-wide">50%</div>
            </div>
            <div className="w-8 h-0.5 bg-primary/25 rounded-full" />
        </div>
    );
}

export function OfertaSeasonalLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md border border-primary/25" />
            <div className="absolute -top-1 left-2 w-3 h-3 bg-primary/35 rounded-full" />
            <div className="absolute -top-1 right-2 w-3 h-3 bg-primary/25 rounded-full" />
            <div className="absolute -bottom-1 left-3 w-3 h-3 bg-primary/25 rounded-full" />
            <div className="absolute -bottom-1 right-3 w-3 h-3 bg-primary/35 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-2 py-1 bg-primary/20 rounded-full">
                    <div className="text-primary/70 text-[7px] font-bold">SEASON</div>
                </div>
            </div>
        </div>
    );
}

export function OfertaBannerLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-6 rounded-full bg-primary/25 border border-primary/30 flex items-center justify-between px-2">
                <div className="w-5 h-5 rounded-full bg-primary/45" />
                <div className="h-1 w-10 bg-primary/40 rounded-full" />
                <div className="w-2 h-2 bg-primary/50 rotate-45" />
            </div>
        </div>
    );
}

export function OfertaExplosionLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-primary/30 rotate-45 rounded-sm" />
                <div className="absolute inset-1 bg-primary/45 rotate-12 rounded-sm" />
                <div className="absolute inset-2 bg-primary/60 rotate-[-12deg] rounded-sm" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-primary-foreground text-[7px] font-bold">BOOM</div>
                </div>
            </div>
        </div>
    );
}

export function OfertaCompareLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-8 h-10 rounded-md bg-primary/20 border border-primary/25" />
            <div className="w-2 h-2 bg-primary/50 rotate-45" />
            <div className="w-8 h-10 rounded-md bg-primary/45 border border-primary/40" />
        </div>
    );
}

export function OfertaExclusiveLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full border-2 border-primary/35 bg-primary/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary/70" />
                <div className="absolute -bottom-1 px-1.5 py-0.5 bg-primary/35 rounded-full">
                    <span className="text-primary-foreground text-[6px] font-bold">VIP</span>
                </div>
            </div>
        </div>
    );
}

export function OfertaBundleLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="grid grid-cols-2 gap-0.5">
                <div className="h-5 bg-primary/35 rounded-sm" />
                <div className="h-5 bg-primary/25 rounded-sm" />
                <div className="h-5 bg-primary/25 rounded-sm" />
                <div className="h-5 bg-primary/35 rounded-sm" />
            </div>
            <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-primary/60 text-primary-foreground text-[6px] font-bold flex items-center justify-center">
                2x
            </div>
        </div>
    );
}

export function OfertaUrgencyLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-7 rounded-md bg-primary/25 border border-primary/35 flex items-center justify-center gap-1">
                <div className="w-2 h-3 bg-primary/50 rounded-sm" />
                <div className="w-2 h-3 bg-primary/50 rounded-sm" />
                <div className="w-1 h-1 bg-primary/60 rounded-full" />
                <div className="w-2 h-3 bg-primary/50 rounded-sm" />
                <div className="w-2 h-3 bg-primary/50 rounded-sm" />
            </div>
        </div>
    );
}

export function OfertaSplitLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-1/2 rounded-md bg-primary/25 border border-primary/30" />
            <div className="w-1/2 rounded-md bg-primary/40 border border-primary/40" />
        </div>
    );
}

export function EscaparateZenLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md border border-primary/20" />
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary/35 rounded-md" />
            <div className="absolute bottom-1 right-8 w-6 h-0.5 bg-primary/20 rounded-full" />
        </div>
    );
}

export function EscaparateMarcoLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 border-2 border-primary/35 rounded-md" />
            <div className="absolute inset-3 bg-primary/20 rounded-md" />
            <div className="absolute inset-5 border-2 border-primary/45 rounded-md" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 bg-primary/55 rounded-md" />
            </div>
        </div>
    );
}

export function EscaparateEspiralLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-2 rounded-full border-2 border-primary/25" />
            <div className="absolute inset-4 rounded-full border-2 border-primary/30" />
            <div className="absolute inset-6 rounded-full border-2 border-primary/40" />
            <div className="absolute right-3 bottom-3 w-4 h-4 bg-primary/50 rounded-full" />
        </div>
    );
}

export function EscaparateDiagonalLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-2 bg-primary/20 rounded-md -skew-y-6" />
            <div className="absolute left-2 top-3 w-8 h-1 bg-primary/45 rotate-[-25deg] rounded-full" />
            <div className="absolute right-2 bottom-3 w-6 h-6 bg-primary/50 rounded-md rotate-[-15deg]" />
        </div>
    );
}

export function EscaparateCapasLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/15 rounded-md" />
            <div className="absolute inset-3 bg-primary/25 rounded-md" />
            <div className="absolute inset-5 bg-primary/40 rounded-md" />
        </div>
    );
}

export function EscaparateRadialLayout() {
    return (
        <div className="w-full h-full relative p-1 flex items-center justify-center">
            <div className="absolute inset-1 rounded-full border-2 border-primary/25" />
            <div className="absolute w-8 h-8 rounded-full bg-primary/45" />
            <div className="absolute w-11 h-1 bg-primary/35 rotate-45 rounded-full" />
            <div className="absolute w-11 h-1 bg-primary/35 -rotate-45 rounded-full" />
        </div>
    );
}

export function EscaparateSimetriaLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-3 h-10 bg-primary/25 rounded-sm" />
            <div className="w-5 h-12 bg-primary/45 rounded-sm" />
            <div className="w-3 h-10 bg-primary/25 rounded-sm" />
        </div>
    );
}

export function EscaparateContrasteLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-y-1 left-1 w-1/2 bg-primary/45 rounded-md" />
            <div className="absolute inset-y-1 right-1 w-1/2 bg-primary/20 rounded-md" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary/60 rounded-md" />
        </div>
    );
}

export function EscaparateGoboLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/20 rounded-md" />
            <div className="absolute inset-1 grid grid-cols-3 gap-0.5">
                <div className="bg-primary/30 rounded-sm" />
                <div className="bg-primary/15 rounded-sm" />
                <div className="bg-primary/30 rounded-sm" />
                <div className="bg-primary/15 rounded-sm" />
                <div className="bg-primary/35 rounded-sm" />
                <div className="bg-primary/15 rounded-sm" />
                <div className="bg-primary/30 rounded-sm" />
                <div className="bg-primary/15 rounded-sm" />
                <div className="bg-primary/30 rounded-sm" />
            </div>
            <div className="absolute right-2 bottom-2 w-5 h-5 bg-primary/50 rounded-md" />
        </div>
    );
}

export function EscaparateLevitacionLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-7 h-7 bg-primary/45 rounded-md" />
            <div className="absolute top-2 left-3 w-3 h-3 bg-primary/35 rounded-sm" />
            <div className="absolute bottom-2 right-3 w-3 h-3 bg-primary/25 rounded-sm" />
            <div className="absolute bottom-2 left-5 w-2 h-2 bg-primary/30 rounded-full" />
        </div>
    );
}

export function EscaparateBodegonLayout() {
    return (
        <div className="w-full h-full relative p-1 flex items-center justify-center">
            <div className="absolute left-2 bottom-2 w-5 h-5 bg-primary/35 rounded-md" />
            <div className="absolute right-2 bottom-2 w-6 h-4 bg-primary/45 rounded-md" />
            <div className="absolute left-4 top-2 w-4 h-6 bg-primary/25 rounded-md" />
        </div>
    );
}

export function EscaparateHeroLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-11 h-11 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                <div className="w-7 h-7 bg-primary/45 rounded-md" />
                <div className="absolute -bottom-1 w-8 h-1 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function EscaparateFloatingLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-8 h-8 bg-primary/45 rounded-md shadow-lg shadow-primary/25" />
            <div className="absolute top-2 left-3 w-2 h-2 bg-primary/35 rounded-full" />
            <div className="absolute bottom-2 right-3 w-2 h-2 bg-primary/25 rounded-full" />
        </div>
    );
}

export function EscaparateLifestyleLayout() {
    return (
        <div className="w-full h-full p-1">
            <div className="relative w-full h-full bg-primary/20 rounded-md overflow-hidden">
                <div className="absolute top-1 left-1 w-8 h-4 bg-primary/30 rounded-sm" />
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary/45 rounded-md" />
                <div className="absolute bottom-1 left-1 w-10 h-1 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function EscaparateMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-6 h-6 bg-primary/35 rounded-md" />
            <div className="w-10 h-0.5 bg-primary/20 rounded-full" />
            <div className="w-6 h-0.5 bg-primary/15 rounded-full" />
        </div>
    );
}

export function EscaparateDetailLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md bg-primary/20" />
            <div className="absolute left-1.5 top-1.5 w-6 h-6 rounded-full border-2 border-primary/40 flex items-center justify-center">
                <div className="w-3 h-3 bg-primary/45 rounded-full" />
            </div>
            <div className="absolute right-1.5 bottom-1.5 w-8 h-3 bg-primary/30 rounded-md" />
        </div>
    );
}

export function Escaparate360Layout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full border-2 border-primary/35">
                <div className="absolute top-1 left-4 w-2 h-2 bg-primary/40 rounded-full" />
                <div className="absolute right-2 bottom-2 w-2 h-2 bg-primary/30 rounded-full" />
                <div className="absolute left-2 bottom-4 w-2 h-2 bg-primary/25 rounded-full" />
            </div>
            <div className="absolute right-2 bottom-2 w-2 h-2 bg-primary/45 rounded-full" />
        </div>
    );
}

export function EscaparateContextLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md bg-primary/20" />
            <div className="absolute left-1.5 top-1.5 w-7 h-9 rounded-md bg-primary/30" />
            <div className="absolute right-1.5 top-2 w-4 h-3 bg-primary/40 rounded-sm" />
            <div className="absolute right-1.5 bottom-2 w-5 h-3 bg-primary/25 rounded-sm" />
        </div>
    );
}

export function EscaparateEditorialLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex-1 rounded-md bg-primary/30" />
            <div className="h-1 w-full bg-primary/35 rounded-full" />
            <div className="h-1 w-[70%] bg-primary/20 rounded-full" />
        </div>
    );
}

export function EscaparateGridLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/45 rounded-sm" />
        </div>
    );
}

export function EscaparateComparisonLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-8 h-10 rounded-md bg-primary/20 border border-primary/25" />
            <div className="w-3 h-3 bg-primary/50 rotate-45" />
            <div className="w-8 h-10 rounded-md bg-primary/45 border border-primary/40" />
        </div>
    );
}

export function EscaparateUnboxingLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-8">
                <div className="absolute bottom-0 w-full h-5 bg-primary/35 rounded-md" />
                <div className="absolute -top-1 left-1 w-8 h-4 bg-primary/25 rounded-md rotate-[-12deg]" />
            </div>
        </div>
    );
}
