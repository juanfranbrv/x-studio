import { useEffect, useState } from 'react'

type StylePresetImage = {
  _id: string
  image_url: string
}

type UseStylePresetImagesResult = {
  stylePresets: StylePresetImage[]
  isLoading: boolean
}

export function useStylePresetImages(): UseStylePresetImagesResult {
  const [stylePresets, setStylePresets] = useState<StylePresetImage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadStylePresets() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/style-presets', {
          method: 'GET',
          signal: controller.signal,
          // Revalida siempre contra el CDN (rapido y barato) en vez de servir
          // una copia local cacheada que oculta los estilos recien creados.
          cache: 'no-cache',
        })

        if (!response.ok) {
          throw new Error(`Style presets request failed (${response.status})`)
        }

        const payload = (await response.json()) as Array<{
          _id?: unknown
          image_url?: unknown
        }>

        if (!controller.signal.aborted) {
          setStylePresets(
            payload.map((row) => ({
              _id: String(row._id || ''),
              image_url: typeof row.image_url === 'string' ? row.image_url : '',
            })).filter((row) => row._id && row.image_url),
          )
        }
      } catch {
        if (!controller.signal.aborted) {
          setStylePresets([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadStylePresets()

    return () => {
      controller.abort()
    }
  }, [])

  return { stylePresets, isLoading }
}
