import { Crown } from 'lucide-react';
import { IconUser, IconSparkles, IconGift } from '@/components/ui/icons';

export function LanzamientoCountdownLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-2">
            <div className="px-2 py-1 bg-primary/30 rounded-md text-primary/70 text-base font-mono font-bold">03</div>
            <div className="text-primary/40 text-lg font-bold">:</div>
            <div className="px-2 py-1 bg-primary/30 rounded-md text-primary/70 text-base font-mono font-bold">21</div>
        </div>
    );
}

export function LanzamientoRevealLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1.5">
            <div className="w-12 h-12 bg-gradient-to-t from-primary/60 to-primary/10 rounded-lg shadow-inner" />
        </div>
    );
}

export function LanzamientoSilhouetteLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1 bg-primary/10">
            <IconUser className="w-10 h-10 text-primary/60 scale-150 mt-4 translate-y-2 opacity-50" />
        </div>
    );
}

export function LanzamientoGlitchLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
            <div className="w-[60%] h-1 bg-primary/40 rounded-sm translate-x-0.5" />
            <div className="w-[60%] h-1 bg-primary/30 rounded-sm -translate-x-0.5" />
            <div className="w-[60%] h-1 bg-primary/20 rounded-sm translate-x-0.5" />
        </div>
    );
}

export function LanzamientoTornLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-full bg-primary/20 rounded-sm relative overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-px bg-primary/50 border-dashed" />
            </div>
        </div>
    );
}

export function LanzamientoCalendarLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-1">
            <div className="w-6 h-1 bg-primary/50 rounded-t-sm" />
            <div className="w-6 h-5 bg-primary/20 rounded-b-sm flex items-center justify-center">
                <div className="text-primary/60 text-[8px] font-bold">24</div>
            </div>
        </div>
    );
}

export function LanzamientoBoxLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-5 h-5 border-2 border-primary/40 rounded-sm relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-primary/30 rounded-t-sm" />
            </div>
        </div>
    );
}

export function LanzamientoBlurLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-6 bg-primary/20 rounded-full blur-sm" />
        </div>
    );
}

export function LanzamientoPuzzleLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-1.5">
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/40 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="bg-primary/15 border border-dashed border-primary/30 rounded-sm" />
        </div>
    );
}

export function LanzamientoVortexLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary/60" />
        </div>
    );
}

export function LanzamientoMysteryLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <div className="text-primary/50 text-xl font-bold">?</div>
        </div>
    );
}

export function RetoVersusLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-3 h-4 bg-primary/40 rounded-sm" />
            <div className="text-primary/50 text-[8px] font-bold">VS</div>
            <div className="w-3 h-4 bg-primary/30 rounded-sm" />
        </div>
    );
}

export function RetoGiveawayLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center relative">
                <IconGift className="w-8 h-8 text-primary/60" />
                <IconSparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary/40" />
            </div>
        </div>
    );
}

export function RetoBracketLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="flex flex-col gap-0.5">
                <div className="flex gap-1 items-center">
                    <div className="w-2 h-1 bg-primary/30 rounded-sm" />
                    <div className="w-1 h-2 border-r border-t border-primary/40" />
                </div>
                <div className="flex gap-1 items-center">
                    <div className="w-2 h-1 bg-primary/30 rounded-sm" />
                    <div className="w-1 h-2 border-r border-b border-primary/40" />
                </div>
            </div>
            <div className="w-2 h-1 bg-primary/50 rounded-sm" />
        </div>
    );
}

export function RetoDareLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-primary/60 text-lg font-black">!</div>
        </div>
    );
}

export function RetoRulesLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[6px]">1.</div>
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[6px]">2.</div>
                <div className="h-0.5 flex-1 bg-primary/20 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[6px]">3.</div>
                <div className="h-0.5 flex-1 bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function RetoViralLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative">
                <div className="w-4 h-4 bg-primary/40 rounded-full" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary/60 rounded-full" />
            </div>
        </div>
    );
}

export function RetoQuizLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="text-primary/60 text-sm font-bold">?</div>
            <div className="flex gap-0.5">
                <div className="w-2 h-2 bg-primary/30 rounded-sm" />
                <div className="w-2 h-2 bg-primary/40 rounded-sm" />
            </div>
        </div>
    );
}

export function RetoWinnerLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <Crown className="w-10 h-10 text-primary/60 fill-primary/10" />
            <div className="w-8 h-8 rounded-full bg-primary/40" />
        </div>
    );
}

export function RetoParticipantsLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="flex -space-x-1">
                <div className="w-3 h-3 rounded-full bg-primary/50 ring-1 ring-white" />
                <div className="w-3 h-3 rounded-full bg-primary/40 ring-1 ring-white" />
                <div className="w-3 h-3 rounded-full bg-primary/30 ring-1 ring-white" />
            </div>
        </div>
    );
}

export function TalentoHiringLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="px-2 py-1 bg-primary/40 rounded-sm">
                <div className="text-white text-[7px] font-bold">HIRING</div>
            </div>
        </div>
    );
}

export function TalentoValuesLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-2 h-2 bg-primary/40 rounded-sm" />
            <div className="w-2 h-2 bg-primary/50 rounded-sm" />
            <div className="w-2 h-2 bg-primary/30 rounded-sm" />
        </div>
    );
}

export function TalentoBenefitsLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[6px]">✓</div>
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[6px]">✓</div>
                <div className="h-0.5 flex-1 bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function TalentoSpotlightLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-5 h-5 rounded-full bg-primary/40 ring-4 ring-primary/15" />
        </div>
    );
}

export function TalentoOfficeLayout() {
    return (
        <div className="w-full h-full flex items-end p-1">
            <div className="w-full h-[60%] bg-primary/20 rounded-t-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-primary/40 rounded-sm" />
            </div>
        </div>
    );
}

export function TalentoRemoteLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-5 h-4 border border-primary/40 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
            </div>
        </div>
    );
}

export function TalentoGrowthLayout() {
    return (
        <div className="w-full h-full flex items-end justify-center gap-0.5 p-1">
            <div className="w-2 h-2 bg-primary/25 rounded-sm" />
            <div className="w-2 h-3 bg-primary/35 rounded-sm" />
            <div className="w-2 h-5 bg-primary/50 rounded-sm" />
        </div>
    );
}

export function TalentoJobCardLayout() {
    return (
        <div className="w-full h-full flex flex-col p-1.5 bg-primary/5 rounded-sm">
            <div className="h-0.5 w-[60%] bg-primary/40 rounded-full" />
            <div className="h-0.5 w-[40%] bg-primary/20 rounded-full mt-0.5" />
            <div className="mt-auto w-3 h-1 bg-primary/30 rounded-sm" />
        </div>
    );
}

export function TalentoDiversityLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className="w-2 h-2 rounded-full bg-primary/40" />
            <div className="w-2 h-2 rounded-full bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/20" />
        </div>
    );
}
