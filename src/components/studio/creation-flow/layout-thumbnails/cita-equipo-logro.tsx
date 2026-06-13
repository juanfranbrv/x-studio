import { Trophy, Star, Users, Heart, HandMetal } from 'lucide-react';
import { IconCheck, IconUser, IconMessage } from '@/components/ui/icons';

export function CitaMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
            <div className="text-primary/60 text-3xl font-serif">&quot;</div>
            <div className="w-[85%] h-1 bg-primary/25 rounded-full" />
            <div className="w-[60%] h-1 bg-primary/15 rounded-full" />
        </div>
    );
}

export function CitaPortraitLayout() {
    return (
        <div className="w-full h-full flex gap-2 p-2">
            <div className="w-2/5 bg-primary/30 rounded-md" />
            <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="text-primary/50 text-base leading-none">&quot;</div>
                <div className="h-1 w-full bg-primary/20 rounded-full" />
                <div className="h-1 w-[80%] bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function CitaTypoLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-primary/70 text-4xl font-black tracking-tighter">&quot;Aa&quot;</div>
        </div>
    );
}

export function CitaStickerLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1.5">
            <div className="w-full h-full border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center">
                <div className="text-primary/50 text-2xl font-serif">&quot;</div>
            </div>
        </div>
    );
}

export function CitaTextureLayout() {
    return (
        <div className="w-full h-full bg-primary/10 flex items-center justify-center p-2">
            <div className="text-primary/60 text-4xl font-serif italic">&quot;</div>
        </div>
    );
}

export function CitaBocadilloLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <div className="bg-primary/20 rounded-xl px-4 py-2 relative">
                <IconMessage className="w-6 h-6 text-primary/60" />
                <div className="absolute -bottom-1 left-3 w-3 h-3 bg-primary/20 rotate-45" />
            </div>
        </div>
    );
}

export function CitaCarouselLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1.5 p-1.5">
            <div className="flex-1 h-10 bg-primary/10 rounded-md" />
            <div className="w-12 h-14 bg-primary/40 rounded-lg flex items-center justify-center shadow-md">
                <div className="text-primary/70 text-xl font-serif">&quot;</div>
            </div>
            <div className="flex-1 h-10 bg-primary/10 rounded-md" />
        </div>
    );
}

export function CitaManuscriptLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1.5 p-3">
            <div className="h-1 w-full bg-primary/15 rounded-full" />
            <div className="h-1 w-[90%] bg-primary/25 rounded-full" />
            <div className="h-1 w-[80%] bg-primary/15 rounded-full" />
            <div className="h-1 w-[70%] bg-primary/10 rounded-full" />
        </div>
    );
}

export function CitaFloatLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative">
                <div className="w-12 h-12 bg-primary/15 rounded-full animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center text-primary/60 text-2xl font-serif">&quot;</div>
            </div>
        </div>
    );
}

export function EquipoPortraitLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-1">
            <div className="w-10 h-10 rounded-full bg-primary/40 ring-2 ring-primary/10" />
            <div className="w-[80%] h-1 bg-primary/25 rounded-full" />
        </div>
    );
}

export function EquipoGroupLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1.5 p-2">
            <Users className="w-12 h-12 text-primary/50" />
        </div>
    );
}

export function EquipoCollageLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-1">
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/40 rounded-sm" />
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
        </div>
    );
}

export function EquipoQuoteLayout() {
    return (
        <div className="w-full h-full flex items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-full bg-primary/40 shrink-0" />
            <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="h-1 w-full bg-primary/20 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function EquipoActionLayout() {
    return (
        <div className="w-full h-full flex items-end justify-center p-2">
            <IconUser className="w-12 h-12 text-primary/40" />
        </div>
    );
}

export function EquipoCardLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 bg-primary/5 rounded-sm">
            <div className="w-4 h-4 rounded-full bg-primary/40" />
            <div className="w-[50%] h-0.5 bg-primary/30 rounded-full" />
        </div>
    );
}

export function EquipoWelcomeLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-1">
            <HandMetal className="w-6 h-6 text-primary/40 -rotate-12" />
            <div className="w-8 h-8 rounded-full bg-primary/40" />
        </div>
    );
}

export function EquipoAnniversaryLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
            <div className="text-primary/60 text-xs font-bold">5</div>
            <div className="w-4 h-4 rounded-full bg-primary/30" />
        </div>
    );
}

export function EquipoDeptLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-1">
            <div className="flex gap-1">
                <div className="w-4 h-4 rounded-full bg-primary/40" />
                <div className="w-4 h-4 rounded-full bg-primary/40" />
                <div className="w-4 h-4 rounded-full bg-primary/40" />
            </div>
            <div className="w-[80%] h-1 bg-primary/25 rounded-full" />
        </div>
    );
}

export function EquipoLeadLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-5 h-5 rounded-full bg-primary/50 ring-2 ring-primary/20" />
            <div className="w-[50%] h-0.5 bg-primary/30 rounded-full" />
        </div>
    );
}

export function EquipoCultureLayout() {
    return (
        <div className="w-full h-full grid grid-cols-3 gap-0.5 p-1">
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/35 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
        </div>
    );
}

export function LogroTrophyLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-primary/60" />
        </div>
    );
}

export function LogroConfettiLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center relative">
            <div className="text-primary/70 text-3xl font-bold">!</div>
            <div className="absolute top-1 left-3 w-1.5 h-1.5 bg-primary/30 rounded-full" />
            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary/40 rounded-full" />
            <div className="absolute bottom-3 left-4 w-1.5 h-1.5 bg-primary/25 rounded-full" />
        </div>
    );
}

export function LogroSealLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-10 h-10 rounded-full border-2 border-primary/50 flex items-center justify-center">
                <IconCheck className="w-6 h-6 text-primary/60" />
            </div>
        </div>
    );
}

export function LogroStarLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <Star className="w-10 h-10 text-primary/60 fill-primary/20" />
        </div>
    );
}

export function LogroPodiumLayout() {
    return (
        <div className="w-full h-full flex items-end justify-center gap-1.5 p-2">
            <div className="w-4 h-6 bg-primary/30 rounded-t-sm" />
            <div className="w-4 h-10 bg-primary/50 rounded-t-sm" />
            <div className="w-4 h-4 bg-primary/20 rounded-t-sm" />
        </div>
    );
}

export function LogroBalloonsLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-2">
            <div className="w-4 h-6 bg-primary/40 rounded-full" />
            <div className="w-4 h-6 bg-primary/30 rounded-full mt-2" />
        </div>
    );
}

export function LogroSocialLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="text-primary/70 text-xl font-black">1K</div>
            <Heart className="w-4 h-4 text-primary/40 fill-primary/10" />
        </div>
    );
}

export function LogroAnniversaryLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-primary/40 rounded-full flex items-center justify-center">
                <div className="text-primary/60 text-base font-bold">10</div>
            </div>
        </div>
    );
}
