'use client'

import {
    IconBrandKit,
    IconCarousel,
    IconDashboardSquare,
    IconGrid,
    IconLayout,
    IconRotate,
    IconWand,
} from '@/components/ui/icons'

const MATERIAL_ICON_COMPONENTS = {
    '3d_rotation': IconRotate,
    area_chart: IconDashboardSquare,
    auto_awesome_motion: IconCarousel,
    grid_view: IconGrid,
    view_agenda: IconLayout,
    wand_stars: IconWand,
    workspace_premium: IconBrandKit,
} as const

type MaterialIconName = keyof typeof MATERIAL_ICON_COMPONENTS

export function renderMaterialIconBridge(iconName: string, className: string) {
    const normalized = iconName.trim() as MaterialIconName
    const Icon = MATERIAL_ICON_COMPONENTS[normalized] || IconLayout

    return <Icon aria-hidden="true" className={className} focusable={false} />
}
