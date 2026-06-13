import { Flame, Bell } from 'lucide-react';

export function ComunicadoOficialLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1">
            <div className="relative w-7 h-7">
                <div className="absolute inset-0 rounded-full border-2 border-primary/40" />
                <div className="absolute inset-1 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-2 rounded-full bg-primary/15" />
                <div className="absolute inset-y-1.5 left-1/2 w-1 -translate-x-1/2 bg-primary/60" />
            </div>
            <div className="w-[75%] h-1 bg-primary/30 rounded-full" />
            <div className="w-[60%] h-1 bg-primary/20 rounded-full" />
        </div>
    );
}

export function ComunicadoUrgenteLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1">
            <div className="w-full h-2 bg-primary/40 rounded-full" />
            <div className="relative w-7 h-7 flex items-end justify-center">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-transparent border-b-primary/50" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-2.5 bg-primary/70" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/70 rounded-full" />
            </div>
            <div className="w-[70%] h-1 bg-primary/20 rounded-full" />
        </div>
    );
}

export function ComunicadoModernoLayout() {
    return (
        <div className="w-full h-full flex gap-1 p-1">
            <div className="w-2/3 h-full rounded-sm bg-primary/30 relative overflow-hidden">
                <div className="absolute -top-1 -right-2 w-7 h-7 rounded-full bg-primary/20" />
                <div className="absolute top-1 left-1 w-2.5 h-2.5 border-2 border-primary/45 rounded-sm" />
                <div className="absolute bottom-1 left-1 h-1.5 w-7 bg-primary/40 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col justify-between py-0.5">
                <div className="h-2 bg-primary/40 rounded-sm" />
                <div className="h-1.5 bg-primary/30 rounded-sm" />
                <div className="h-1.5 bg-primary/20 rounded-sm" />
            </div>
        </div>
    );
}

export function ComunicadoEditorialLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1">
            <div className="flex items-end gap-1">
                <div className="text-primary/80 text-xl font-black leading-none">A</div>
                <div className="text-primary/50 text-sm font-bold leading-none">a</div>
            </div>
            <div className="w-[75%] h-1 bg-primary/20 rounded-full" />
        </div>
    );
}

export function ComunicadoComunidadLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1">
            <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-primary/30 rounded-full" />
                <div className="w-5 h-5 bg-primary/45 rounded-full" />
                <div className="w-4 h-4 bg-primary/25 rounded-full" />
            </div>
            <div className="w-[65%] h-1 bg-primary/20 rounded-full" />
        </div>
    );
}

export function ComunicadoMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-1.5 p-1">
            <div className="w-3 h-3 bg-primary/40 rounded-sm" />
            <div className="w-full h-1 bg-primary/25 rounded-full" />
            <div className="w-[70%] h-1 bg-primary/15 rounded-full" />
        </div>
    );
}

export function ComunicadoCardLayout() {
    return (
        <div className="w-full h-full p-1">
            <div className="w-full h-full rounded-sm bg-primary/5 flex items-center justify-center">
                <div className="w-[88%] h-[75%] rounded-sm border-2 border-primary/25 bg-primary/10 shadow-sm flex flex-col gap-1 p-1.5">
                    <div className="h-2 w-[70%] bg-primary/30 rounded-sm" />
                    <div className="h-1 w-full bg-primary/20 rounded-full" />
                    <div className="h-1 w-[80%] bg-primary/15 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function ComunicadoMarquesinaLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-1.5 p-1">
            <div className="h-3 bg-primary/45 rounded-sm flex items-center gap-1 px-1">
                <div className="w-3 h-1.5 bg-primary/70 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/15 rounded-full" />
            </div>
            <div className="h-1 w-[75%] bg-primary/25 rounded-full" />
        </div>
    );
}

export function ComunicadoMemoLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 bg-primary/40 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-1.5 bg-primary/30 rounded-sm" />
                <div className="h-1 flex-1 bg-primary/20 rounded-full" />
            </div>
            <div className="mt-0.5 h-1 w-full bg-primary/20 rounded-full" />
            <div className="h-1 w-[80%] bg-primary/15 rounded-full" />
            <div className="h-1 w-[50%] bg-primary/20 rounded-full self-end" />
        </div>
    );
}

export function ComunicadoCartelLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-1 p-1">
            <div className="h-5 bg-primary/45 rounded-sm" />
            <div className="h-2 bg-primary/25 rounded-sm" />
            <div className="h-1 w-[60%] bg-primary/20 rounded-full" />
        </div>
    );
}

export function ComunicadoTimelineLayout() {
    return (
        <div className="w-full h-full flex items-center p-1">
            <div className="relative h-full w-4 flex items-center justify-center">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-primary/25" />
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/45 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/30 rounded-full" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/20 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col gap-1 pl-1.5">
                <div className="h-1 w-full bg-primary/20 rounded-full" />
                <div className="h-1 w-[80%] bg-primary/15 rounded-full" />
                <div className="h-1 w-[60%] bg-primary/10 rounded-full" />
            </div>
        </div>
    );
}

export function ComunicadoIconLayout() {
    return (
        <div className="w-full h-full flex items-center gap-1.5 p-1">
            <div className="w-5 h-5 rounded-sm border-2 border-primary/35 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary/40 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col gap-1 justify-center">
                <div className="h-1 w-full bg-primary/25 rounded-full" />
                <div className="h-1 w-[70%] bg-primary/15 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaBigLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-full h-3 rounded-md bg-primary/30" />
            <div className="w-[85%] h-3 rounded-md bg-primary/20" />
            <div className="relative mt-0.5">
                <div className="text-primary/80 text-2xl font-black leading-none">?</div>
                <div className="absolute -top-1 -right-2 w-3 h-3 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaVersusLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-full h-10 rounded-md overflow-hidden border border-primary/25">
                <div className="absolute inset-y-0 left-0 w-1/2 bg-primary/25" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-primary/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary/60 text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                        VS
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PreguntaConversationLayout() {
    return (
        <div className="w-full h-full relative p-1 flex items-center justify-center">
            <div className="absolute left-1 top-2 w-9 h-5 rounded-lg bg-primary/35" />
            <div className="absolute left-3 top-6 w-2 h-2 bg-primary/35 rotate-45" />
            <div className="absolute right-1 bottom-2 w-10 h-5 rounded-lg border-2 border-primary/35 bg-background" />
            <div className="absolute right-4 bottom-1 w-2 h-2 border-2 border-primary/35 bg-background rotate-45" />
            <div className="absolute left-3 top-3 w-4 h-1 bg-primary/45 rounded-full" />
            <div className="absolute right-3 bottom-3 w-4 h-1 bg-primary/30 rounded-full" />
        </div>
    );
}

export function PreguntaThoughtLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center">
                <div className="w-5 h-5 bg-primary/35 rounded-full" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/35 rounded-full" />
                <div className="absolute -top-2 left-2 w-2 h-2 bg-primary/25 rounded-full" />
                <div className="absolute -right-3 top-4 w-1.5 h-1.5 bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaControLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                <Flame className="w-6 h-6 text-primary/70" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/40 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaBoldLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10 rounded-full border-2 border-primary/40 flex items-center justify-center">
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/35 rounded-full" />
                <div className="text-primary/70 text-2xl font-black leading-none">?</div>
            </div>
        </div>
    );
}

export function PreguntaPollLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-primary/45 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-primary/50 rounded-full" />
                </div>
                <div className="h-2 flex-1 bg-primary/35 rounded-md" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-primary/30" />
                <div className="h-2 flex-1 bg-primary/20 rounded-md" />
            </div>
            <div className="mt-0.5 h-1 w-[70%] bg-primary/20 rounded-full self-end" />
        </div>
    );
}

export function PreguntaOptionsLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex items-center justify-between h-4 px-1.5 rounded-md bg-primary/25">
                <div className="w-4 h-4 rounded-full bg-primary/45 flex items-center justify-center text-[7px] font-bold text-primary-foreground">A</div>
                <div className="h-1 w-8 bg-primary/40 rounded-full" />
            </div>
            <div className="flex items-center justify-between h-4 px-1.5 rounded-md border border-primary/30">
                <div className="w-4 h-4 rounded-full border-2 border-primary/40 flex items-center justify-center text-[7px] font-bold text-primary/70">B</div>
                <div className="h-1 w-8 bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaFillLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-1 p-1">
            <div className="h-1 w-full bg-primary/25 rounded-full" />
            <div className="flex items-center gap-1">
                <div className="h-1 w-4 bg-primary/25 rounded-full" />
                <div className="h-2 w-10 border-b-2 border-primary/50" />
                <div className="h-1 w-6 bg-primary/25 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaSliderLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-full h-2 bg-primary/20 rounded-full relative">
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary/45 rounded-full ring-2 ring-primary/30" />
            </div>
            <div className="flex w-full justify-between px-1">
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaEmojiLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-7 h-7 rounded-full border-2 border-primary/50 flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-primary/60 rounded-full" />
                <div className="w-1 h-1 bg-primary/60 rounded-full" />
            </div>
            <div className="w-7 h-7 rounded-full border-2 border-primary/35 flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-primary/45 rounded-full" />
                <div className="w-1 h-1 bg-primary/45 rounded-full" />
            </div>
            <div className="w-7 h-7 rounded-full border-2 border-primary/25 flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-primary/35 rounded-full" />
                <div className="w-1 h-1 bg-primary/35 rounded-full" />
            </div>
        </div>
    );
}

export function PreguntaDebateLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="relative w-6 h-5 rounded-md bg-primary/35 flex items-center justify-center">
                <div className="absolute -bottom-1 left-1.5 w-2 h-2 bg-primary/35 rotate-45" />
                <div className="text-primary-foreground text-[7px] font-bold">A</div>
            </div>
            <div className="w-1.5 h-5 bg-primary/30 rounded-full" />
            <div className="relative w-6 h-5 rounded-md border-2 border-primary/35 flex items-center justify-center">
                <div className="absolute -bottom-1 right-1.5 w-2 h-2 border-2 border-primary/35 rotate-45 bg-background" />
                <div className="text-primary/70 text-[7px] font-bold">B</div>
            </div>
        </div>
    );
}

export function EventoConferenceLayout() {
    return (
        <div className="w-full h-full flex flex-col justify-end p-1">
            <div className="relative h-6 bg-primary/20 rounded-md">
                <div className="absolute left-2 bottom-1 w-6 h-2 bg-primary/35 rounded-full" />
                <div className="absolute right-2 bottom-1 w-2 h-2 bg-primary/45 rounded-full" />
            </div>
            <div className="mt-1 flex gap-0.5 justify-center">
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
            </div>
        </div>
    );
}

export function EventoPartyLayout() {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-1">
            <div className="w-8 h-8 bg-primary/35 rounded-full" />
            <div className="absolute top-1 left-2 w-2 h-2 bg-primary/45 rounded-full" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary/30 rounded-full" />
            <div className="absolute bottom-1 left-3 w-1.5 h-1.5 bg-primary/25 rounded-full" />
        </div>
    );
}

export function EventoWorkshopLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-10 h-7 bg-primary/25 rounded-md border border-primary/30 relative">
                <div className="absolute left-2 top-2 w-4 h-1 bg-primary/40 rounded-full" />
                <div className="absolute right-2 bottom-2 w-2 h-2 bg-primary/45 rounded-sm" />
            </div>
        </div>
    );
}

export function EventoFestivalLayout() {
    return (
        <div className="w-full h-full relative p-1">
            <div className="absolute top-2 left-1 right-1 h-0.5 bg-primary/35 rounded-full" />
            <div className="absolute top-2 left-2 w-3 h-3 bg-primary/30 rotate-45" />
            <div className="absolute top-2 left-6 w-3 h-3 bg-primary/40 rotate-45" />
            <div className="absolute top-2 right-6 w-3 h-3 bg-primary/30 rotate-45" />
            <div className="absolute top-2 right-2 w-3 h-3 bg-primary/40 rotate-45" />
            <div className="absolute bottom-2 left-2 w-8 h-4 bg-primary/20 rounded-md" />
        </div>
    );
}

export function EventoNetworkingLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-4 h-4 bg-primary/45 rounded-full" />
            <div className="w-6 h-0.5 bg-primary/30 rounded-full" />
            <div className="w-4 h-4 bg-primary/30 rounded-full" />
        </div>
    );
}

export function EventoMinimalLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-8 h-3 bg-primary/30 rounded-sm" />
            <div className="w-6 h-6 border-2 border-primary/35 rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 bg-primary/25 rounded-sm" />
            </div>
        </div>
    );
}

export function EventoVirtualLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-10 h-7 bg-primary/25 rounded-md border border-primary/35 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[6px] border-l-primary/60 border-y-[4px] border-y-transparent" />
            </div>
        </div>
    );
}

export function EventoSportLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-9 h-9 rounded-full border-2 border-primary/40 relative">
                <div className="absolute inset-x-1 top-1/2 h-0.5 bg-primary/35" />
                <div className="absolute inset-y-1 left-1/2 w-0.5 bg-primary/35" />
            </div>
        </div>
    );
}

export function EventoGrandLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="relative w-10 h-10">
                <div className="absolute inset-1 bg-primary/35 rotate-45 rounded-sm" />
                <div className="absolute inset-3 bg-primary/50 rotate-45 rounded-sm" />
                <div className="absolute -bottom-1 left-2 w-6 h-2 bg-primary/30 rounded-full" />
            </div>
        </div>
    );
}

export function EventoConcertLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-0.5 p-1">
            <div className="w-2 h-5 bg-primary/30 rounded-sm" />
            <div className="w-2 h-7 bg-primary/45 rounded-sm" />
            <div className="w-2 h-4 bg-primary/25 rounded-sm" />
            <div className="w-2 h-6 bg-primary/40 rounded-sm" />
        </div>
    );
}

export function EventoAgendaLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-1 p-1">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-primary/35" />
                <div className="h-1 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-primary/25" />
                <div className="h-1 flex-1 bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function EventoDateLayout() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-1">
            <div className="w-6 h-1 bg-primary/50 rounded-t-sm" />
            <div className="w-6 h-5 bg-primary/20 rounded-b-sm flex items-center justify-center">
                <div className="text-primary/60 text-[8px] font-bold">15</div>
            </div>
        </div>
    );
}

export function EventoPosterLayout() {
    return (
        <div className="w-full h-full flex flex-col p-1 gap-0.5">
            <div className="flex-1 bg-primary/30 rounded-sm" />
            <div className="h-2 flex flex-col gap-0.5 items-center justify-center">
                <div className="w-[60%] h-0.5 bg-primary/40 rounded-full" />
            </div>
        </div>
    );
}

export function EventoTicketLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <div className="w-full h-4 bg-primary/30 rounded-sm flex items-center">
                <div className="w-1 h-full bg-primary/50 rounded-l-sm" />
                <div className="flex-1 border-l border-dashed border-primary/40" />
            </div>
        </div>
    );
}

export function EventoScheduleLayout() {
    return (
        <div className="w-full h-full flex flex-col gap-0.5 p-2">
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[5px]">10:00</div>
                <div className="h-0.5 flex-1 bg-primary/25 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
                <div className="text-primary/50 text-[5px]">14:00</div>
                <div className="h-0.5 flex-1 bg-primary/20 rounded-full" />
            </div>
        </div>
    );
}

export function EventoReminderLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center p-1">
            <Bell className="w-10 h-10 text-primary/60" />
        </div>
    );
}

export function EventoLiveLayout() {
    return (
        <div className="w-full h-full flex items-center justify-center gap-1 p-1">
            <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
            <div className="text-primary/60 text-[7px] font-bold">LIVE</div>
        </div>
    );
}

export function EventoRecapLayout() {
    return (
        <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1">
            <div className="bg-primary/30 rounded-sm" />
            <div className="bg-primary/25 rounded-sm" />
            <div className="col-span-2 h-2 bg-primary/20 rounded-sm" />
        </div>
    );
}
