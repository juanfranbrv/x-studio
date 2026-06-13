

export function ComparativaSplitLayout() {
    return (
        <div className="w-full h-full flex p-1">
            <div className="w-1/2 bg-primary/25 rounded-l-md" />
            <div className="w-1/2 bg-primary/45 rounded-r-md" />
        </div>
    );
}

export function ComparativaVersusLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="absolute inset-1 bg-primary/20 rounded-md -skew-x-6" />
            <div className="absolute inset-1 bg-primary/35 rounded-md skew-x-6" />
            <div className="relative w-6 h-6 rounded-full bg-primary/60 text-primary-foreground text-[8px] font-bold flex items-center justify-center">VS</div>
        </div>
    );
}

export function ComparativaTransformLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/35 rounded-md" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-primary/20 rounded-sm border border-primary/25" />
            <div className="absolute left-5 top-2 w-3 h-0.5 bg-primary/45 rounded-full" />
        </div>
    );
}

export function ComparativaChecklistLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-1/2 flex flex-col gap-1">
                <div className="h-1 w-full bg-primary/30 rounded-full" />
                <div className="h-1 w-[80%] bg-primary/20 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/15 rounded-full" />
            </div>
            <div className="w-1/2 flex flex-col gap-1">
                <div className="h-1 w-full bg-primary/40 rounded-full" />
                <div className="h-1 w-[80%] bg-primary/30 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function ComparativaMythLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-6 h-6 rounded-md bg-primary/25 flex items-center justify-center">
                <div className="w-3 h-0.5 bg-primary/50 rotate-45" />
                <div className="w-3 h-0.5 bg-primary/50 -rotate-45" />
            </div>
            <div className="w-6 h-6 rounded-md bg-primary/40 flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-primary/60 rounded-full" />
            </div>
        </div>
    );
}

export function ComparativaExpectLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center gap-1 p-1">
            <div className="w-7 h-5 bg-primary/25 rounded-md" />
            <div className="w-7 h-5 bg-primary/40 rounded-md" />
            <div className="absolute bottom-2 left-4 w-2 h-2 bg-primary/25 rotate-45" />
            <div className="absolute bottom-2 right-4 w-2 h-2 bg-primary/40 rotate-45" />
        </div>
    );
}

export function ComparativaPricingLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-10 h-2 bg-primary/20 rounded-full relative">
                <div className="absolute inset-x-1 top-1/2 h-0.5 bg-primary/35" />
            </div>
            <div className="w-8 h-4 bg-primary/45 rounded-md" />
        </div>
    );
}

export function ComparativaHorizontalLayout() {
    return (
        <div className="w-full h-full flex flex-col p-1">
            <div className="flex-1 bg-primary/25 rounded-t-md" />
            <div className="flex-1 bg-primary/45 rounded-b-md" />
        </div>
    );
}

export function ComparativaZoomLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/20 rounded-md" />
            <div className="absolute right-2 bottom-2 w-6 h-6 rounded-full border-2 border-primary/40" />
            <div className="absolute right-1 bottom-1 w-3 h-0.5 bg-primary/45 rotate-45" />
        </div>
    );
}

export function ComparativaFusionLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10">
                <div className="absolute left-0 w-6 h-6 bg-primary/30 rounded-full" />
                <div className="absolute right-0 w-6 h-6 bg-primary/45 rounded-full" />
            </div>
        </div>
    );
}

export function ComparativaBeforeAfterLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-4 h-5 bg-primary/25 rounded-sm" />
            <div className="text-primary/40 text-[6px]">→</div>
            <div className="w-4 h-5 bg-primary/50 rounded-sm" />
        </div>
    );
}

export function ComparativaTableLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-1">
            <div className="h-1.5 flex gap-0.5">
                <div className="flex-1 bg-primary/40 rounded-sm" />
                <div className="flex-1 bg-primary/40 rounded-sm" />
            </div>
            <div className="h-1 flex gap-0.5">
                <div className="flex-1 bg-primary/20 rounded-sm" />
                <div className="flex-1 bg-primary/20 rounded-sm" />
            </div>
            <div className="h-1 flex gap-0.5">
                <div className="flex-1 bg-primary/15 rounded-sm" />
                <div className="flex-1 bg-primary/15 rounded-sm" />
            </div>
        </div>
    );
}

export function ComparativaSliderLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-5 relative">
                <div className="absolute inset-0 bg-primary/25 rounded-sm" />
                <div className="absolute inset-y-0 left-0 w-1/2 bg-primary/40 rounded-l-sm" />
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-primary/60" />
            </div>
        </div>
    );
}

export function ComparativaSpecsLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="h-0.5 flex-1 bg-primary/40 rounded-full" />
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="h-0.5 flex-1 bg-primary/30 rounded-full" />
                <div className="h-0.5 flex-1 bg-primary/40 rounded-full" />
            </div>
        </div>
    );
}

export function ComparativaEvolutionLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-2 h-2 bg-primary/25 rounded-sm" />
            <div className="w-3 h-3 bg-primary/35 rounded-sm" />
            <div className="w-4 h-4 bg-primary/50 rounded-sm" />
        </div>
    );
}

export function ComparativaRadarLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-6 border border-primary/30 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-primary/30 rotate-45" />
            </div>
        </div>
    );
}

export function ComparativaStackLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
            <div className="w-5 h-1.5 bg-primary/40 rounded-sm" />
            <div className="w-5 h-1.5 bg-primary/30 rounded-sm" />
            <div className="w-5 h-1.5 bg-primary/20 rounded-sm" />
        </div>
    );
}

export function ListaChecklistLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-primary/40 rounded-sm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-primary/45 rounded-sm" />
                </div>
                <div className="h-1 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-primary/25 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/20 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-primary/25 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function ListaPasosLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-4 h-4 rounded-full bg-primary/45 flex items-center justify-center text-[7px] font-bold text-primary-foreground">1</div>
            <div className="w-5 h-0.5 bg-primary/30 rounded-full" />
            <div className="w-4 h-4 rounded-full bg-primary/35 flex items-center justify-center text-[7px] font-bold text-primary-foreground">2</div>
            <div className="w-5 h-0.5 bg-primary/25 rounded-full" />
            <div className="w-4 h-4 rounded-full bg-primary/25 flex items-center justify-center text-[7px] font-bold text-primary/70">3</div>
        </div>
    );
}

export function ListaRejillaLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
            <div className="bg-primary/40 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
            <div className="bg-primary/35 rounded-sm" />
        </div>
    );
}

export function ListaTimelineLayout() {
    return (
        <div className="w-full h-full flex items-center p-1">
            <div className="relative w-4 h-full">
                <div className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-0.5 bg-primary/25" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/45 rounded-full" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/30 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col gap-1 pl-1">
                <div className="h-1 w-full bg-primary/25 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function ListaNotaLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 bg-primary/25 rounded-md">
                <div className="absolute right-0 top-0 w-4 h-4 bg-primary/35 rounded-bl-md" />
                <div className="absolute left-2 bottom-2 w-6 h-1 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function ListaIconosLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-4 h-4 bg-primary/45 rounded-full" />
            <div className="w-4 h-4 bg-primary/30 rounded-full" />
            <div className="w-4 h-4 bg-primary/20 rounded-full" />
        </div>
    );
}

export function ListaCarouselLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="absolute left-1 w-7 h-9 rounded-md bg-primary/20 border border-primary/25" />
            <div className="relative w-9 h-11 rounded-md bg-primary/40 border border-primary/35" />
            <div className="absolute bottom-1 flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary/45 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/25 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function ListaNumeradoLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-primary/45 rounded-full text-[7px] font-bold text-primary-foreground flex items-center justify-center">1</div>
                <div className="h-1 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-primary/35 rounded-full text-[7px] font-bold text-primary-foreground flex items-center justify-center">2</div>
                <div className="h-1 flex-1 bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function ListaProsConsLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-1/2 rounded-md bg-primary/25 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary/45 rotate-45" />
            </div>
            <div className="w-1/2 rounded-md bg-primary/35 flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-primary/60 rounded-full" />
            </div>
        </div>
    );
}

export function ListaAgendaLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/35 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/25 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/20 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/20 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function ListaBulletsLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                <div className="h-0.5 flex-1 bg-primary/20 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                <div className="h-0.5 flex-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function ListaRankingLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="text-primary/60 text-[6px] font-bold">1</div>
                <div className="h-1.5 flex-1 bg-primary/40 rounded-sm" />
            </div>
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[6px]">2</div>
                <div className="h-1.5 flex-[0.7] bg-primary/30 rounded-sm" />
            </div>
            <div className="flex items-center gap-1">
                <div className="text-primary/40 text-[6px]">3</div>
                <div className="h-1.5 flex-[0.5] bg-primary/20 rounded-sm" />
            </div>
        </div>
    );
}

export function ListaMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="h-0.5 w-full bg-primary/30 rounded-full" />
            <div className="h-0.5 w-[85%] bg-primary/20 rounded-full" />
            <div className="h-0.5 w-[70%] bg-primary/15 rounded-full" />
        </div>
    );
}
