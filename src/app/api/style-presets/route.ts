import { NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/../convex/_generated/api'

export const revalidate = 300

type StylePresetImageRow = {
  _id: string
  slug: string
  image_url: string
}

export async function GET() {
  try {
    const rows = (await fetchQuery(api.stylePresets.listActiveImages, {})) as Array<{
      _id: unknown
      slug: unknown
      image_url: unknown
    }>

    const presets: StylePresetImageRow[] = rows.map((row) => ({
      _id: String(row._id),
      slug: typeof row.slug === 'string' ? row.slug : '',
      image_url: typeof row.image_url === 'string' ? row.image_url : '',
    }))

    return NextResponse.json(presets, {
      headers: {
        // El navegador revalida siempre (peticion barata contra el CDN), mientras el
        // CDN cachea 5 min y se purga on-demand al cambiar estilos en Admin
        // (ver revalidateStylePresets). Asi los cambios se ven al instante sin
        // golpear Convex en cada carga.
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudieron cargar los estilos',
      },
      { status: 500 },
    )
  }
}
