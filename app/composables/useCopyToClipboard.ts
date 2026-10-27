import { useToast } from '~/composables/useToast'

/**
 * Composable para manipulação segura e desacoplada da Clipboard API no navegador.
 */
export function useCopyToClipboard() {
  const toast = useToast()

  const copy = async (
    text: string,
    successMessage = 'Copiado para a área de transferência!',
  ): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        toast.success(successMessage)
        return true
      }
      throw new Error('Clipboard API não disponível no ambiente atual.')
    } catch (err: unknown) {
      toast.error('Falha ao copiar.')
      console.error(err)
      return false
    }
  }

  const copyHtml = async (
    html: string,
    plainText?: string,
    successMessage = 'Copiado para a área de transferência!',
  ): Promise<boolean> => {
    try {
      const fallbackText =
        plainText ||
        html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.write &&
        typeof ClipboardItem !== 'undefined'
      ) {
        const textBlob = new Blob([fallbackText], { type: 'text/plain' })
        const htmlBlob = new Blob([html], { type: 'text/html' })
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ])
        toast.success(successMessage)
        return true
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fallbackText)
        toast.success(successMessage)
        return true
      }
      throw new Error('Clipboard API não disponível no ambiente atual.')
    } catch (err: unknown) {
      toast.error('Falha ao copiar.')
      console.error(err)
      return false
    }
  }

  return { copy, copyHtml }
}
