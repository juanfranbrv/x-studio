import { auth } from '@clerk/nextjs/server'
import ffmpegPath from 'ffmpeg-static'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim()
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null
const LOCAL_SONGS_DIR = path.join(process.cwd(), 'songs')
const LOCAL_SONG_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg'])
const MAX_VIDEO_DURATION_MS = 60_000

type ExportVideoBody = {
    slides?: Array<{ index?: number; imageUrl?: string | null }>
    aspectRatio?: '1:1' | '4:5' | '3:4'
    withMusic?: boolean
    brandName?: string
    hook?: string
}

type AudioTrackCandidate = {
    name: string
    url: string
}

function getCanvasDimensions(aspectRatio: ExportVideoBody['aspectRatio']) {
    switch (aspectRatio) {
        case '4:5':
            return { width: 1080, height: 1350 }
        case '3:4':
            return { width: 1080, height: 1440 }
        case '1:1':
        default:
            return { width: 1080, height: 1080 }
    }
}

function getSafeExtensionFromContentType(contentType: string | null, url: string) {
    const normalizedType = String(contentType || '').toLowerCase()
    if (normalizedType.includes('png')) return '.png'
    if (normalizedType.includes('webp')) return '.webp'
    if (normalizedType.includes('jpeg') || normalizedType.includes('jpg')) return '.jpg'
    if (normalizedType.includes('gif')) return '.gif'

    const parsedUrl = new URL(url)
    const rawExt = path.extname(parsedUrl.pathname).toLowerCase()
    if (rawExt) return rawExt
    return '.jpg'
}

async function downloadToFile(url: string, filePath: string) {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`No se pudo descargar el recurso: ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(filePath, buffer)
}

async function listLegacySongs(baseUrl: string): Promise<AudioTrackCandidate[]> {
    try {
        const localFiles = await fs.readdir(LOCAL_SONGS_DIR)
        return localFiles
            .filter((file) => LOCAL_SONG_EXTENSIONS.has(path.extname(file).toLowerCase()))
            .sort((a, b) => a.localeCompare(b))
            .map((file) => ({
                name: file.replace(path.extname(file), '').replace(/[_-]+/g, ' ').trim(),
                url: `${baseUrl}/api/experimental-songs?name=${encodeURIComponent(file)}`,
            }))
    } catch {
        return []
    }
}

function runFfmpeg(args: string[]) {
    return new Promise<void>((resolve, reject) => {
        const resolvedBinary = process.env.FFMPEG_PATH?.trim() || ffmpegPath || 'ffmpeg'
        const child = spawn(resolvedBinary, args, { windowsHide: true })
        let stderr = ''

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString()
        })

        child.on('error', (error) => {
            reject(error)
        })

        child.on('close', (code) => {
            if (code === 0) {
                resolve()
                return
            }
            reject(new Error(stderr || `ffmpeg exited with code ${code}`))
        })
    })
}

export async function POST(request: NextRequest) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'carousel-video-'))

    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!convex) {
            return NextResponse.json({ error: 'Missing NEXT_PUBLIC_CONVEX_URL' }, { status: 500 })
        }

        const body = (await request.json()) as ExportVideoBody
        const orderedSlides = Array.isArray(body.slides)
            ? body.slides
                .filter((slide) => typeof slide?.imageUrl === 'string' && slide.imageUrl)
                .sort((a, b) => (a.index || 0) - (b.index || 0))
            : []

        if (orderedSlides.length === 0) {
            return NextResponse.json({ error: 'No exportable slides' }, { status: 400 })
        }

        const videoConfig = await convex.query(api.settings.getCarouselVideoConfig, {})
        const { width, height } = getCanvasDimensions(body.aspectRatio)
        const concatLines: string[] = []
        const imagePaths: string[] = []
        const durations = orderedSlides.map((_slide, index) =>
            index === orderedSlides.length - 1 ? videoConfig.lastSlideDurationMs : videoConfig.slideDurationMs
        )
        const totalDurationMs = durations.reduce((sum, duration) => sum + duration, 0)

        if (totalDurationMs > MAX_VIDEO_DURATION_MS) {
            return NextResponse.json(
                { error: 'La duracion total del video supera el maximo de 60 segundos permitido.' },
                { status: 400 }
            )
        }

        const totalDurationSeconds = (totalDurationMs / 1000).toFixed(3)

        for (let index = 0; index < orderedSlides.length; index += 1) {
            const slide = orderedSlides[index]
            const response = await fetch(slide.imageUrl as string)
            if (!response.ok) {
                throw new Error(`No se pudo descargar la slide ${index + 1}`)
            }
            const extension = getSafeExtensionFromContentType(response.headers.get('content-type'), slide.imageUrl as string)
            const imagePath = path.join(tmpDir, `slide-${index}${extension}`)
            const imageBuffer = Buffer.from(await response.arrayBuffer())
            await fs.writeFile(imagePath, imageBuffer)
            imagePaths.push(imagePath)
            concatLines.push(`file '${imagePath.replace(/'/g, "'\\''")}'`)
            concatLines.push(`duration ${(durations[index] / 1000).toFixed(3)}`)
        }

        concatLines.push(`file '${imagePaths[imagePaths.length - 1].replace(/'/g, "'\\''")}'`)

        const concatPath = path.join(tmpDir, 'slides.txt')
        await fs.writeFile(concatPath, concatLines.join('\n'), 'utf8')

        let audioPath: string | null = null
        if (body.withMusic) {
            const activeTracks = await convex.query(api.adminAudio.listActiveTracks, {})
            const legacyTracks = await listLegacySongs(new URL(request.url).origin)
            const audioPool = [...activeTracks.map((track) => ({ name: track.name, url: String(track.url) })), ...legacyTracks]

            if (audioPool.length === 0) {
                return NextResponse.json({ error: 'No hay pistas disponibles para el video.' }, { status: 400 })
            }

            const selectedTrack = audioPool[Math.floor(Math.random() * audioPool.length)]
            const audioExtension = path.extname(new URL(selectedTrack.url).pathname) || '.mp3'
            audioPath = path.join(tmpDir, `audio${audioExtension}`)
            await downloadToFile(selectedTrack.url, audioPath)
        }

        const outputPath = path.join(tmpDir, 'carousel-export.mp4')
        const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p`

        const ffmpegArgs = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concatPath,
        ]

        if (audioPath) {
            ffmpegArgs.push('-stream_loop', '-1', '-i', audioPath)
        }

        ffmpegArgs.push(
            '-vf', videoFilter,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-t', totalDurationSeconds
        )

        if (audioPath) {
            ffmpegArgs.push(
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest'
            )
        }

        ffmpegArgs.push(
            '-movflags', '+faststart',
            outputPath
        )

        await runFfmpeg(ffmpegArgs)

        const outputBuffer = await fs.readFile(outputPath)
        const date = new Date()
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const safeBrandName = (body.brandName || 'carousel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const safeHook = (body.hook || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30) || 'video'
        const fileName = `${safeBrandName}-${safeHook}-${dateStr}.mp4`

        return new NextResponse(outputBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store, max-age=0',
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Video export failed'
        return NextResponse.json({ error: message }, { status: 500 })
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
    }
}
