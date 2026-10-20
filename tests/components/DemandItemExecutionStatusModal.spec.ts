import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemExecutionStatusModal from '~/components/demands/DemandItemExecutionStatusModal.vue'

const mockUpdateDemandItemExecutionStatus = vi.fn().mockResolvedValue(undefined)
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useDemandProducts', () => () => ({
  updateDemandItemExecutionStatus: mockUpdateDemandItemExecutionStatus,
}))

describe('DemandItemExecutionStatusModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly when opened with an item', () => {
    const item = {
      id: 'dp-1',
      demand_id: 'dem-1',
      product_id: 'p-1',
      product_name_snapshot: 'Papel A4',
      unit_name_snapshot: 'Pacote',
      quantity: 50,
      execution_status: 'homologated' as const,
      execution_error_details: null,
      sort_order: 1,
      unit_id: 'u-1',
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
    }

    const wrapper = mount(DemandItemExecutionStatusModal, {
      props: {
        modelValue: true,
        item,
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /><slot name="actions" /></div>',
          },
          UiAlert: true,
          UiSelect: true,
          UiTextarea: true,
          UiButton: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Papel A4')
    expect(wrapper.text()).toContain('Qtd: 50')
  })

  it('populates initial status from item execution_status', async () => {
    const item = {
      id: 'dp-1',
      demand_id: 'dem-1',
      product_id: 'p-1',
      product_name_snapshot: 'Papel A4',
      quantity: 50,
      execution_status: 'shipped' as const,
      execution_error_details: null,
      sort_order: 1,
      unit_id: 'u-1',
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
    }

    const wrapper = mount(DemandItemExecutionStatusModal, {
      props: {
        modelValue: true,
        item,
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /><slot name="actions" /></div>',
          },
          UiAlert: true,
          UiSelect: true,
          UiTextarea: true,
          UiButton: true,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    expect(vm.status).toBe('shipped')
  })
})
