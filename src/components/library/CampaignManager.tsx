'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { IconCheck, IconDelete, IconEdit, IconPlus, IconXCircle } from '@/components/ui/icons'
import type { ContentCampaign } from './contentLibraryTypes'

interface CampaignManagerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    campaigns: ContentCampaign[]
    counts: Record<string, number>
    busy: boolean
    onCreate: (name: string) => void
    onRename: (id: string, name: string) => void
    onDelete: (campaign: ContentCampaign) => void
    labels: {
        title: string
        description: string
        createPlaceholder: string
        create: string
        assetsCount: (count: number) => string
        empty: string
    }
}

export function CampaignManager({
    open,
    onOpenChange,
    campaigns,
    counts,
    busy,
    onCreate,
    onRename,
    onDelete,
    labels,
}: CampaignManagerProps) {
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const handleCreate = () => {
        const name = newName.trim()
        if (!name) return
        onCreate(name)
        setNewName('')
    }

    const startEdit = (campaign: ContentCampaign) => {
        setEditingId(campaign.id)
        setEditName(campaign.name)
    }

    const commitEdit = (id: string) => {
        const name = editName.trim()
        if (name) onRename(id, name)
        setEditingId(null)
        setEditName('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{labels.title}</DialogTitle>
                    <DialogDescription>{labels.description}</DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2">
                    <Input
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleCreate() }}
                        placeholder={labels.createPlaceholder}
                        className="h-10 rounded-xl"
                    />
                    <Button type="button" onClick={handleCreate} disabled={busy || !newName.trim()}>
                        <IconPlus className="mr-1 h-4 w-4" />
                        {labels.create}
                    </Button>
                </div>

                <div className="mt-1 max-h-[50vh] space-y-2 overflow-y-auto">
                    {campaigns.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
                    ) : campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className="flex items-center gap-2 rounded-xl border border-border/60 bg-[hsl(var(--surface-alt))] p-2"
                        >
                            {editingId === campaign.id ? (
                                <>
                                    <Input
                                        value={editName}
                                        onChange={(event) => setEditName(event.target.value)}
                                        onKeyDown={(event) => { if (event.key === 'Enter') commitEdit(campaign.id) }}
                                        autoFocus
                                        className="h-9 rounded-lg"
                                    />
                                    <Button type="button" size="sm" onClick={() => commitEdit(campaign.id)} disabled={busy}>
                                        <IconCheck className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                        <IconXCircle className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{campaign.name}</p>
                                        <p className="text-xs text-muted-foreground">{labels.assetsCount(counts[campaign.name] || 0)}</p>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(campaign)} disabled={busy}>
                                        <IconEdit className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(campaign)} disabled={busy}>
                                        <IconDelete className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
