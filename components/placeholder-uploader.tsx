'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { getDirectorySettings, updateDirectorySettings } from '@/lib/actions'
import { deleteDirectoryAsset, uploadDirectoryAsset } from '@/lib/storage'
import { Button } from '@/components/ui/button'

const MAX_UPLOAD_SIZE_MB = 10
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; familyPlaceholderUrl: string | null; logoUrl: string | null }
  | { status: 'error'; message: string }

export function PlaceholderUploader() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const effectiveUrl =
    state.status === 'loaded'
      ? (state.familyPlaceholderUrl ?? state.logoUrl)
      : null

  const hasCustomPlaceholder = state.status === 'loaded' && !!state.familyPlaceholderUrl

  useEffect(() => {
    async function load() {
      try {
        const s = await getDirectorySettings()
        setState({
          status: 'loaded',
          familyPlaceholderUrl: s?.family_placeholder_url ?? null,
          logoUrl: s?.logo_url ?? null,
        })
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
    void load()
  }, [])

  const helperText = useMemo(() => {
    if (state.status !== 'loaded') return ''
    if (state.familyPlaceholderUrl) return 'Using a custom placeholder image.'
    if (state.logoUrl) return 'No custom placeholder set — falling back to the directory logo.'
    return 'No placeholder set — families without a photo will show initials.'
  }, [state])

  async function onFileSelected(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`Image must be under ${MAX_UPLOAD_SIZE_MB}MB`)
      return
    }

    setSaving(true)
    try {
      const previous = state.status === 'loaded' ? state.familyPlaceholderUrl : null
      const url = await uploadDirectoryAsset(file, 'placeholder')
      const next = await updateDirectorySettings({ family_placeholder_url: url })

      setState({
        status: 'loaded',
        familyPlaceholderUrl: next.family_placeholder_url ?? null,
        logoUrl: next.logo_url ?? null,
      })

      if (previous && previous !== url) {
        await deleteDirectoryAsset(previous).catch(() => null)
      }

      toast.success('Placeholder image updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setSaving(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemoveCustom() {
    if (state.status !== 'loaded' || !state.familyPlaceholderUrl) return

    setSaving(true)
    const currentUrl = state.familyPlaceholderUrl
    try {
      const next = await updateDirectorySettings({ family_placeholder_url: null })
      setState({
        status: 'loaded',
        familyPlaceholderUrl: next.family_placeholder_url ?? null,
        logoUrl: next.logo_url ?? null,
      })
      await deleteDirectoryAsset(currentUrl).catch(() => null)
      toast.success('Custom placeholder removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove image')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-slate-100">
          {state.status === 'loading' || saving ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : effectiveUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={effectiveUrl} alt="Family photo placeholder" className="h-full w-full object-contain p-2" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-7 w-7 text-slate-300" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">Family Photo Placeholder</h2>
          <p className="text-sm text-slate-500">Image shown when a family has no photo uploaded.</p>
          {state.status === 'error' ? (
            <p className="mt-1 text-sm text-red-600">{state.message}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{helperText}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={saving || state.status === 'loading'}
        >
          <Upload className="mr-2 h-4 w-4" />
          {hasCustomPlaceholder ? 'Change' : 'Upload'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={handleRemoveCustom}
          disabled={!hasCustomPlaceholder || saving}
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            void onFileSelected(file)
          }}
        />
      </div>
    </div>
  )
}

