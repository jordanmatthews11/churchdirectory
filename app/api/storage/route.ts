import { NextRequest, NextResponse } from 'next/server'
import { putObject, deleteObject, keyFromPublicUrl } from '@/lib/r2'

const ALLOWED_PREFIXES = ['family-photos/', 'member-photos/', 'directory-assets/']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function isAllowedKey(key: string): boolean {
  return ALLOWED_PREFIXES.some((p) => key.startsWith(p))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const key = formData.get('key') as string | null

    if (!file || !key) {
      return NextResponse.json({ error: 'file and key are required' }, { status: 400 })
    }
    if (!isAllowedKey(key)) {
      return NextResponse.json({ error: 'Invalid storage key prefix' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await putObject(key, buffer, file.type)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('R2 upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string }
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const key = keyFromPublicUrl(url)
    if (!key || !isAllowedKey(key)) {
      return NextResponse.json({ error: 'Invalid or unrecognized URL' }, { status: 400 })
    }

    await deleteObject(key)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    console.error('R2 delete error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
