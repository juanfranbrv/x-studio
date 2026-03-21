/**
 * Client-side logo variation generator using Canvas API.
 * Produces transparent, grayscale, mono (black silhouette), and inverted (white silhouette) versions.
 */

export interface LogoVariation {
  type: 'transparent' | 'grayscale' | 'mono' | 'inverted'
  label: string
  dataUrl: string
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx }
}

/** Desaturate to grayscale, preserving alpha */
function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }
  return imageData
}

/** Convert to true black & white — grayscale then threshold for high contrast */
function toMono(imageData: ImageData): ImageData {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      // Threshold: light pixels → white, dark pixels → black
      const bw = gray > 128 ? 255 : 0
      data[i] = bw
      data[i + 1] = bw
      data[i + 2] = bw
    }
  }
  return imageData
}

/** Invert all color channels (255 - value), preserving alpha */
function toInverted(imageData: ImageData): ImageData {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
  }
  return imageData
}

export async function generateLogoVariations(logoUrl: string): Promise<LogoVariation[]> {
  try {
    const img = await loadImage(logoUrl)
    const { width, height } = img
    const variations: LogoVariation[] = []

    // Transparent — original logo drawn on transparent canvas (strip any bg)
    const { canvas: tCanvas, ctx: tCtx } = createCanvas(width, height)
    tCtx.drawImage(img, 0, 0)
    variations.push({
      type: 'transparent',
      label: 'Transparente',
      dataUrl: tCanvas.toDataURL('image/png'),
    })

    // Grayscale
    const { canvas: gCanvas, ctx: gCtx } = createCanvas(width, height)
    gCtx.drawImage(img, 0, 0)
    const gData = gCtx.getImageData(0, 0, width, height)
    gCtx.putImageData(toGrayscale(gData), 0, 0)
    variations.push({
      type: 'grayscale',
      label: 'Escala de grises',
      dataUrl: gCanvas.toDataURL('image/png'),
    })

    // Mono (black silhouette)
    const { canvas: mCanvas, ctx: mCtx } = createCanvas(width, height)
    mCtx.drawImage(img, 0, 0)
    const mData = mCtx.getImageData(0, 0, width, height)
    mCtx.putImageData(toMono(mData), 0, 0)
    variations.push({
      type: 'mono',
      label: 'Monocromo',
      dataUrl: mCanvas.toDataURL('image/png'),
    })

    // Inverted — computed from mono (invert the B&W result)
    const { canvas: iCanvas, ctx: iCtx } = createCanvas(width, height)
    iCtx.drawImage(mCanvas, 0, 0)
    const iData = iCtx.getImageData(0, 0, width, height)
    iCtx.putImageData(toInverted(iData), 0, 0)
    variations.push({
      type: 'inverted',
      label: 'Invertido',
      dataUrl: iCanvas.toDataURL('image/png'),
    })

    return variations
  } catch (err) {
    console.error('Failed to generate logo variations:', err)
    return []
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
