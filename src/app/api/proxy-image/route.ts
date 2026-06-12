import { NextRequest, NextResponse } from 'next/server'

import { isAllowedProxyImageUrl as isAllowedUrl } from '@/lib/proxy-image-allowlist'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Accept: 'image/*,*/*;q=0.8',
        Referer: 'https://www.instagram.com/',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 })
    }

    const buffer = await upstream.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[proxy-image] error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
