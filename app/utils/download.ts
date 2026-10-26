/**
 * Utilitários para download de arquivos no navegador de forma desacoplada e segura.
 */

/**
 * Dispara o download de um Blob no navegador.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Dispara o download de uma string de texto como arquivo.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8;',
): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}

/**
 * Dispara o download de uma estrutura de dados arbitrária como arquivo JSON formatado.
 */
export function downloadJson(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;')
}
