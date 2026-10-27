import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCopyToClipboard } from '../../app/composables/useCopyToClipboard'

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)

describe('composables/useCopyToClipboard', () => {
  const mockWriteText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies text to clipboard and triggers success toast', async () => {
    mockWriteText.mockResolvedValueOnce(undefined)
    const { copy } = useCopyToClipboard()

    const result = await copy('Texto de teste', 'Sucesso!')

    expect(result).toBe(true)
    expect(mockWriteText).toHaveBeenCalledWith('Texto de teste')
    expect(mockToast.success).toHaveBeenCalledWith('Sucesso!')
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('handles clipboard failure and triggers error toast', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Permission denied'))
    const { copy } = useCopyToClipboard()

    const result = await copy('Texto falho')

    expect(result).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('Falha ao copiar.')
  })

  it('handles environment without clipboard gracefully', async () => {
    vi.stubGlobal('navigator', {})
    const { copy } = useCopyToClipboard()

    const result = await copy('Sem clipboard')

    expect(result).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('Falha ao copiar.')
  })

  it('copies HTML with ClipboardItem when supported', async () => {
    const mockWrite = vi.fn().mockResolvedValueOnce(undefined)
    class MockClipboardItem {
      data: Record<string, Blob>
      constructor(data: Record<string, Blob>) {
        this.data = data
      }
    }
    vi.stubGlobal('ClipboardItem', MockClipboardItem)
    vi.stubGlobal('navigator', {
      clipboard: {
        write: mockWrite,
        writeText: mockWriteText,
      },
    })

    const { copyHtml } = useCopyToClipboard()
    const result = await copyHtml(
      '<table><tr><td>Item</td></tr></table>',
      'Item',
      'Tabela copiada!',
    )

    expect(result).toBe(true)
    expect(mockWrite).toHaveBeenCalledTimes(1)
    expect(mockToast.success).toHaveBeenCalledWith('Tabela copiada!')
  })

  it('falls back to writeText when ClipboardItem is not available for copyHtml', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    mockWriteText.mockResolvedValueOnce(undefined)
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    const { copyHtml } = useCopyToClipboard()
    const result = await copyHtml('<table><tr><td>Item</td></tr></table>', 'Item')

    expect(result).toBe(true)
    expect(mockWriteText).toHaveBeenCalledWith('Item')
    expect(mockToast.success).toHaveBeenCalledWith('Copiado para a área de transferência!')
  })
})
