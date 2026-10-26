import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, nextTick } from 'vue'
import LoginPage from '~/pages/login.vue'

const { navigateToMock, getRedirectUrlMock, routeQueryRef } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  getRedirectUrlMock: vi.fn(),
  routeQueryRef: { query: {} as Record<string, string> },
}))

const userRef = ref<{ id: string } | null>(null)

mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('useRequestURL', () => () => new URL('http://127.0.0.1:3000/login'))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => () => routeQueryRef)
mockNuxtImport('useAuth', () => () => ({
  user: userRef,
  signInWithPassword: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtpCode: vi.fn(),
  getRedirectUrl: getRedirectUrlMock,
}))

const stubs = {
  UiCard: { template: '<div><slot name="header" /><slot /></div>' },
  UiAlert: { template: '<div><slot /></div>' },
  UiBtnToggle: { template: '<div><slot /></div>' },
  UiButton: { template: '<button><slot /></button>' },
  UiIcon: { template: '<span />' },
  UiInput: { template: '<input />' },
  UiOtpInput: { template: '<input />' },
  NuxtLink: { template: '<a><slot /></a>' },
}

describe('LoginPage redirect stability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = null
    routeQueryRef.query = {}
  })

  it('calls getRedirectUrl and navigateTo only once even if user ref is reassigned with a new object reference', async () => {
    // First call plucks the redirect cookie; subsequent call would return '/'
    getRedirectUrlMock.mockReturnValueOnce('/elections/123/ballot-box/456').mockReturnValue('/')

    const wrapper = mount(LoginPage, { global: { stubs } })
    expect(navigateToMock).not.toHaveBeenCalled()

    // 1st update: session restored
    userRef.value = { id: 'user-1' }
    await nextTick()

    expect(getRedirectUrlMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/elections/123/ballot-box/456', { replace: true })

    // 2nd update: page:start / onAuthStateChange assigns a new object reference to user.value
    userRef.value = { id: 'user-1' }
    await nextTick()

    // Must NOT call getRedirectUrl or navigateTo a second time (which would bounce to '/')
    expect(getRedirectUrlMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not redirect if query has error=inactive', async () => {
    routeQueryRef.query = { error: 'inactive' }
    userRef.value = { id: 'user-1' }

    const wrapper = mount(LoginPage, { global: { stubs } })
    await nextTick()

    expect(navigateToMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
