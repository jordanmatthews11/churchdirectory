export type PhotoBucket = 'family-photos' | 'member-photos'
export type DirectoryAssetBucket = 'directory-assets'

interface JsonLike {
  error?: string
  url?: string
}

function parseJsonLike(bodyText: string): JsonLike | null {
  const trimmed = bodyText.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.parse(trimmed) as JsonLike
  } catch {
    return null
  }
}

function normalizeStorageError(bodyText: string, fallback: string): string {
  const text = bodyText.trim()
  if (!text) return fallback

  if (/request entity too large|payload too large|413/i.test(text)) {
    return 'Image is too large. Please upload a smaller file.'
  }
  if (/supabase environment variables are missing|configuration required/i.test(text)) {
    return 'Storage is not configured correctly. Please contact an administrator.'
  }
  if (/^<!doctype html>/i.test(text) || /^<html/i.test(text)) {
    return fallback
  }
  return text
}

async function r2Upload(key: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('key', key)

  const res = await fetch('/api/storage', { method: 'POST', body: form })
  const bodyText = await res.text()
  const json = parseJsonLike(bodyText)

  if (!res.ok) {
    throw new Error(
      json?.error ? json.error : normalizeStorageError(bodyText, 'Photo upload failed. Please try again.')
    )
  }
  if (!json?.url) {
    throw new Error(normalizeStorageError(bodyText, 'Upload succeeded but did not return a file URL.'))
  }
  return json.url
}

async function r2Delete(url: string): Promise<void> {
  const res = await fetch('/api/storage', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Delete failed')
  }
}

export async function uploadPhoto(
  bucket: PhotoBucket,
  file: File,
  id: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `${bucket}/${id}/${Date.now()}.${ext}`
  return r2Upload(key, file)
}

export async function deletePhoto(_bucket: PhotoBucket, url: string): Promise<void> {
  return r2Delete(url)
}

export type DirectoryAssetKind = 'cover' | 'title' | 'logo' | 'placeholder'

export async function uploadDirectoryAsset(
  file: File,
  kind: DirectoryAssetKind,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const key = `directory-assets/${kind}/${Date.now()}.${ext}`
  return r2Upload(key, file)
}

export async function deleteDirectoryAsset(url: string): Promise<void> {
  return r2Delete(url)
}
