/**
 * Escapes a text string for CSV field compliance (RFC 4180).
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return '""'
  const stringValue = String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

/**
 * Formats a CSV field, only wrapping in quotes if it contains delimiters, quotes, or newlines.
 */
export function formatUnquotedCsvField(value: string | number | null | undefined): string {
  if (value == null) return ''
  const stringValue = String(value)
  if (
    stringValue.includes(';') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}
