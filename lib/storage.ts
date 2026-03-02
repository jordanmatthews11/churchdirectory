import { createClient } from '@/lib/supabase/client'

export type PhotoBucket = 'family-photos' | 'member-photos'

export async function uploadPhoto(
  bucket: PhotoBucket,
  file: File,
  id: string
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deletePhoto(bucket: PhotoBucket, url: string): Promise<void> {
  const supabase = createClient()
  // Extract path from public URL
  const parts = url.split(`/${bucket}/`)
  if (parts.length < 2) return
  const path = parts[1]
  await supabase.storage.from(bucket).remove([path])
}
