import { NextRequest, NextResponse } from 'next/server'

/**
 * Same-origin proxy for R2 images. html2canvas cannot load cross-origin
 * images when the bucket doesn't send CORS headers. This endpoint fetches
 * the image server-side and returns it from our own origin.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 })
  }

  const publicBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '')
  if (!publicBase || !url.startsWith(publicBase)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'proxy error' }, { status: 500 })
  }
}
