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

  return { copy }
}
