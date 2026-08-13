'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CampaignDecision, CampaignDecisionMode } from '@/lib/campaigns/assistant'

export function DecisionSelector({ label, decision, onModeChange }: { label: string; decision?: CampaignDecision; onModeChange: (mode: CampaignDecisionMode) => void }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={decision?.mode ?? 'delegated'} onValueChange={(value) => onModeChange(value as CampaignDecisionMode)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="locked">Fijado por mí</SelectItem>
                    <SelectItem value="allowed">Entre opciones autorizadas</SelectItem>
                    <SelectItem value="delegated">Que lo decida el agente</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

export function ChoiceList({ title, values, selected, onToggle, loading }: { title: string; values: Array<{ id: string; label: string }>; selected: string[]; onToggle: (value: string) => void; loading: boolean }) {
    return (
        <div className="space-y-2">
            <Label>{title}</Label>
            {loading ? <p className="text-sm text-muted-foreground">Cargando catálogo…</p> : null}
            {!loading && values.length === 0 ? <p className="text-sm text-muted-foreground">No hay opciones disponibles.</p> : null}
            <div className="grid gap-2 md:grid-cols-2">
                {values.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 text-sm">
                        <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
                        <span>{item.label}</span>
                    </label>
                ))}
            </div>
        </div>
    )
}
