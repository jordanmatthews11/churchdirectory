/**
 * Photo fit/crop columns (migration 006) may be missing on older databases.
 * PostgREST / Supabase returns errors that mention the unknown column or schema cache.
 */
export function isMissingPhotoPresentationColumnsError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const o = err as { message?: string; details?: string; hint?: string }
  const combined = [o.message, o.details, o.hint].filter(Boolean).join(' ')
  if (!/photo_fit|photo_position/i.test(combined)) return false
  return /column|schema cache|does not exist|could not find|PGRST/i.test(combined)
}

/** Strip presentation fields for retry when DB has not been migrated yet. */
export function omitPhotoPresentationFields<T extends Record<string, unknown>>(values: T): T {
  const {
    photo_fit: _a,
    photo_position_x: _b,
    photo_position_y: _c,
    ...rest
  } = values as T & {
    photo_fit?: unknown
    photo_position_x?: unknown
    photo_position_y?: unknown
  }
  return rest as T
}

export function toThrownError(err: unknown): Error {
  if (err instanceof Error) return err
  if (err && typeof err === 'object' && 'message' in err && (err as { message: unknown }).message != null) {
    return new Error(String((err as { message: unknown }).message))
  }
  return new Error('Request failed')
}
