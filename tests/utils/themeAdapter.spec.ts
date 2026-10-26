import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { applyUiTheme } from '../../app/utils/themeAdapter'

const mockChange = vi.fn()
let mockNuxtApp: { $vuetify?: { theme?: { change?: (t: string) => void } } } | null = null

mockNuxtImport('useNuxtApp', () => () => {
  if (!mockNuxtApp) throw new Error('Nuxt instance not available')
  return mockNuxtApp
})

describe('utils/themeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNuxtApp = {
      $vuetify: {
        theme: {
          change: mockChange,
        },
      },
    }
  })

  it('calls $vuetify.theme.change when available', () => {
    applyUiTheme('dark')
    expect(mockChange).toHaveBeenCalledWith('dark')
  })

  it('fails gracefully without throwing when $vuetify or change is missing', () => {
    mockNuxtApp = {}
    expect(() => applyUiTheme('light')).not.toThrow()
    expect(mockChange).not.toHaveBeenCalled()
  })

  it('fails gracefully when useNuxtApp throws an error', () => {
    mockNuxtApp = null
    expect(() => applyUiTheme('dark')).not.toThrow()
  })
})
