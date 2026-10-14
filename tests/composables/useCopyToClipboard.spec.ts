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
})
