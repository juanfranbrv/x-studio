

export function BtsWipLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-10 h-2 bg-primary/25 rounded-full">
                <div className="w-6 h-2 bg-primary/45 rounded-full" />
            </div>
            <div className="w-4 h-4 bg-primary/35 rounded-sm" />
        </div>
    );
}

export function BtsDeskLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/20 rounded-md" />
            <div className="absolute left-2 top-2 w-6 h-3 bg-primary/35 rounded-sm" />
            <div className="absolute right-2 bottom-2 w-4 h-4 bg-primary/30 rounded-sm" />
        </div>
    );
}

export function BtsMoodboardLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/40 rounded-sm" />
        </div>
    );
}

export function BtsSketchLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-10 h-0.5 bg-primary/35 rotate-[-10deg]" />
            <div className="absolute bottom-2 left-2 w-6 h-0.5 bg-primary/25 rotate-[10deg]" />
        </div>
    );
}

export function BtsBeforeLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-7 h-9 bg-primary/20 rounded-md border border-primary/25" />
            <div className="w-2 h-2 bg-primary/50 rotate-45" />
            <div className="w-7 h-9 bg-primary/45 rounded-md border border-primary/40" />
        </div>
    );
}

export function BtsPaletteLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-6 h-6 bg-primary/45 rounded-full" />
            <div className="w-6 h-6 bg-primary/30 rounded-full" />
            <div className="w-6 h-6 bg-primary/20 rounded-full" />
        </div>
    );
}

export function BtsTeamLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-4 h-4 bg-primary/45 rounded-full" />
            <div className="w-5 h-5 bg-primary/35 rounded-full" />
            <div className="w-4 h-4 bg-primary/25 rounded-full" />
        </div>
    );
}

export function BtsToolsLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2 bg-primary/35 rounded-full" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-primary/45 rounded-full" />
            </div>
        </div>
    );
}

export function BtsStudioLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-10 h-7 bg-primary/25 rounded-md border border-primary/35">
                <div className="mx-auto mt-2 w-4 h-3 bg-primary/45 rounded-sm" />
            </div>
        </div>
    );
}

export function BtsMakingOfLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-8 h-6 bg-primary/30 rounded-sm">
                <div className="w-full h-2 bg-primary/45 rounded-t-sm" />
            </div>
        </div>
    );
}

export function BtsDetailLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/20 rounded-md" />
            <div className="absolute right-2 bottom-2 w-6 h-6 rounded-full border-2 border-primary/40" />
            <div className="absolute right-1 bottom-1 w-3 h-0.5 bg-primary/45 rotate-45" />
        </div>
    );
}

export function BtsFilmstripLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-4 bg-primary/20 flex items-center justify-between px-0.5">
                <div className="w-1 h-full bg-primary/40" />
                <div className="w-3 h-3 bg-primary/30 rounded-sm" />
                <div className="w-1 h-full bg-primary/40" />
            </div>
        </div>
    );
}

export function BtsPolaroidLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-5 h-6 bg-white border border-primary/20 rounded-sm p-0.5 shadow-sm">
                <div className="w-full h-3 bg-primary/25 rounded-sm" />
            </div>
        </div>
    );
}

export function BtsClapperboardLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="flex flex-col">
                <div className="w-5 h-1.5 bg-primary/50 rounded-t-sm flex">
                    <div className="w-1 h-full bg-primary/30" />
                    <div className="w-1 h-full bg-primary/50" />
                    <div className="w-1 h-full bg-primary/30" />
                </div>
                <div className="w-5 h-3 bg-primary/25 rounded-b-sm" />
            </div>
        </div>
    );
}

export function BtsStoryLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-3 h-5 bg-primary/40 rounded-sm" />
            <div className="w-3 h-5 bg-primary/25 rounded-sm" />
        </div>
    );
}

export function BtsFocusLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-6 border-2 border-primary/40 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-primary/50 rounded-full" />
            </div>
        </div>
    );
}

export function CatalogoGridLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
            <div className="col-span-2 row-span-2 bg-primary/40 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
        </div>
    );
}

export function CatalogoMasonryLayout() {
    return (
        <div className="w-full h-full flex gap-0.5 p-1">
            <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex-1 bg-primary/35 rounded-sm" />
                <div className="h-3 bg-primary/25 rounded-sm" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
                <div className="h-3 bg-primary/20 rounded-sm" />
                <div className="flex-1 bg-primary/40 rounded-sm" />
            </div>
        </div>
    );
}

export function CatalogoHeroLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-11 h-11 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                <div className="w-7 h-7 bg-primary/50 rounded-md" />
                <div className="absolute -bottom-1 w-8 h-1 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function CatalogoCarruselLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="absolute left-1 w-7 h-9 rounded-md bg-primary/20 border border-primary/25" />
            <div className="absolute right-1 w-7 h-9 rounded-md bg-primary/20 border border-primary/25" />
            <div className="relative w-9 h-11 rounded-md bg-primary/40 border border-primary/35" />
            <div className="absolute bottom-1 flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary/45 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/25 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function CatalogoLookbookLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-1">
            <div className="flex-1 bg-primary/30 rounded-md" />
            <div className="h-1.5 w-full bg-primary/25 rounded-full" />
            <div className="h-1 w-[70%] bg-primary/15 rounded-full" />
        </div>
    );
}

export function CatalogoMinimalLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 rounded-md border border-primary/20" />
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary/35 rounded-md" />
            <div className="absolute bottom-1 right-7 w-5 h-1 bg-primary/20 rounded-full" />
        </div>
    );
}

export function CatalogoBundleLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="grid grid-cols-2 gap-0.5">
                <div className="h-5 bg-primary/35 rounded-sm" />
                <div className="h-5 bg-primary/25 rounded-sm" />
                <div className="h-5 bg-primary/25 rounded-sm" />
                <div className="h-5 bg-primary/40 rounded-sm" />
            </div>
            <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-primary/60 text-primary-foreground text-[6px] font-bold flex items-center justify-center">
                2x
            </div>
        </div>
    );
}

export function CatalogoVariantsLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-8 h-8 bg-primary/45 rounded-md" />
            <div className="flex flex-col gap-1">
                <div className="w-3 h-3 bg-primary/35 rounded-full" />
                <div className="w-3 h-3 bg-primary/25 rounded-full" />
                <div className="w-3 h-3 bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function CatalogoDetailLayout() {
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

export function CatalogoFlatlayLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5 p-1">
            <div className="col-span-2 bg-primary/30 rounded-sm" />
            <div className="bg-primary/20 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/35 rounded-sm" />
        </div>
    );
}

export function CatalogoComparativoLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-8 h-10 rounded-md bg-primary/20 border border-primary/25" />
            <div className="w-2 h-2 bg-primary/50 rotate-45" />
            <div className="w-8 h-10 rounded-md bg-primary/45 border border-primary/40" />
        </div>
    );
}

export function CatalogoLifestyleLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute inset-1 bg-primary/20 rounded-md" />
            <div className="absolute left-2 bottom-2 w-7 h-7 bg-primary/45 rounded-md" />
            <div className="absolute right-2 top-2 w-8 h-1 bg-primary/35 rounded-full" />
        </div>
    );
}

export function CatalogoShelfLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-end gap-0.5 p-1">
            <div className="flex gap-0.5 items-end">
                <div className="w-3 h-4 bg-primary/35 rounded-sm" />
                <div className="w-3 h-5 bg-primary/25 rounded-sm" />
                <div className="w-3 h-3 bg-primary/20 rounded-sm" />
            </div>
            <div className="h-0.5 w-full bg-primary/35 rounded-full" />
        </div>
    );
}

export function CatalogoCollectionLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="grid grid-cols-3 gap-0.5">
                <div className="h-4 bg-primary/30 rounded-sm" />
                <div className="h-4 bg-primary/40 rounded-sm" />
                <div className="h-4 bg-primary/25 rounded-sm" />
            </div>
            <div className="h-1 w-full bg-primary/25 rounded-full" />
        </div>
    );
}

export function CatalogoNewLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative">
                <div className="w-6 h-6 bg-primary/35 rounded-md" />
                <div className="absolute -top-1 -right-1 px-1 bg-primary/60 rounded-sm text-primary-foreground text-[6px] font-bold">NEW</div>
            </div>
        </div>
    );
}
