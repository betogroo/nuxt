/**
 * Converts a free-text name into a filesystem-safe slug (lowercase, `[a-z0-9_-]` only).
 * Falls back to `fallback` when the name is empty.
 */
export function toSafeFilename(name: string | null | undefined, fallback: string): string {
  return (name || fallback).toLowerCase().replace(/[^a-z0-9_-]/g, '_')
}
