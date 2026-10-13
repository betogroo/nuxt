import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import NewDemandModal from '~/components/iirgd/NewDemandModal.vue'

const vuetify = createVuetify({ components, directives })

mockNuxtImport('useToast', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useIirgdDemands', () => () => ({
  createDemand: vi.fn(),
}))
mockNuxtImport('useIirgdCitizens', () => () => ({
  fetchCitizenByDocument: vi.fn(),
}))
mockNuxtImport('useIirgdDocumentTypes', () => () => ({
  fetchAllActiveDocumentTypes: vi.fn().mockResolvedValue([
    { id: 'dt-1', name: 'Primeira Via' },
    { id: 'dt-2', name: 'Antecedentes Numeral' },
  ]),
  createPendingDocumentType: vi.fn(),
}))
mockNuxtImport('useAsyncData', () => () => ({
  data: ref([
    { id: 'dt-1', name: 'Primeira Via' },
    { id: 'dt-2', name: 'Antecedentes Numeral' },
  ]),
  pending: ref(false),
  refresh: vi.fn(),
}))

describe('NewDemandModal', () => {
  it('renders UiCheckbox with label "Cidadão de outro estado (sem RG de SP)"', () => {
    const wrapper = mount(NewDemandModal, {
      props: {
        modelValue: true,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          UiModal: { template: '<div><slot /><slot name="actions" /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('Cidadão de outro estado (sem RG de SP)')
  })

  it('swaps RG input for other_document input when checkbox is checked', async () => {
    const wrapper = mount(NewDemandModal, {
      props: {
        modelValue: true,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          UiModal: { template: '<div><slot /><slot name="actions" /></div>' },
        },
      },
    })

    // Initially shows RG
    expect(wrapper.text()).toContain('Número do RG')
    expect(wrapper.text()).not.toContain('Documento de Outro Estado')

    // Find and check the checkbox
    const checkbox = wrapper.findComponent({ name: 'UiCheckbox' })
    expect(checkbox.exists()).toBe(true)

    const input = checkbox.find('input[type="checkbox"]')
    await input.setValue(true)

    // Now shows Documento de Outro Estado
    expect(wrapper.text()).toContain('Documento de Outro Estado')
  })
})
