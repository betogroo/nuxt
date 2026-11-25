import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import BatchDemandModal from '~/components/iirgd/BatchDemandModal.vue'

const mockCheckExistingCitizensAndActiveDemands = vi.fn()
const mockCreateDemandsBatch = vi.fn()
const mockFetchAllActiveDocumentTypes = vi.fn()
const mockFetchPendingDocumentTypes = vi.fn()
const mockCreatePendingDocumentType = vi.fn()
const mockToastSuccess = vi.fn()

mockNuxtImport('useIirgdDemands', () => () => ({
  checkExistingCitizensAndActiveDemands: mockCheckExistingCitizensAndActiveDemands,
  createDemandsBatch: mockCreateDemandsBatch,
}))

mockNuxtImport('useIirgdDocumentTypes', () => () => ({
  fetchAllActiveDocumentTypes: mockFetchAllActiveDocumentTypes,
  fetchPendingDocumentTypes: mockFetchPendingDocumentTypes,
  createPendingDocumentType: mockCreatePendingDocumentType,
}))

mockNuxtImport('useToast', () => () => ({
  success: mockToastSuccess,
  error: vi.fn(),
}))

describe('IirgdBatchDemandModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAllActiveDocumentTypes.mockResolvedValue([
      { id: 'dt-ant-num', name: 'Antecedentes Numeral', is_active: true, is_pending: false },
      { id: 'dt-1via-cin', name: 'Primeira Via CIN', is_active: true, is_pending: false },
      { id: 'dt-2via', name: 'Segunda Via', is_active: true, is_pending: false },
    ])
    mockFetchPendingDocumentTypes.mockResolvedValue([])
    mockCheckExistingCitizensAndActiveDemands.mockResolvedValue({
      byRg: new Map(),
      byCpf: new Map(),
    })
  })

  it('starts with empty state and resets when closed', async () => {
    const wrapper = shallowMount(BatchDemandModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      hasParsed: boolean
      isCompleted: boolean
    }

    vm.rawText = '1342-5\t49770365-8\tCAROLINA SANTOS DA CRUZ\tAntecedentes Numeral'
    vm.hasParsed = true

    await wrapper.setProps({ modelValue: false })
    await flushPromises()

    expect(vm.rawText).toBe('')
    expect(vm.hasParsed).toBe(false)
    expect(vm.isCompleted).toBe(false)
  })

  it('processes valid lines, flags active demands, and detects new pending document types', async () => {
    const byRg = new Map()
    byRg.set('11864903-6', {
      citizen: { id: 'cit-active', name: 'ANTONIO DE SOUZA LEITE', rg: '11864903-6' },
      hasActiveDemand: true,
    })
    byRg.set('14376013-0', {
      citizen: { id: 'cit-inactive', name: 'ZÉLIA DE JESUS SILVA', rg: '14376013-0' },
      hasActiveDemand: false,
    })

    mockCheckExistingCitizensAndActiveDemands.mockResolvedValue({
      byRg,
      byCpf: new Map(),
    })

    const wrapper = shallowMount(BatchDemandModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      hasParsed: boolean
      readyItems: Array<{
        rg: string | null
        cpf: string | null
        name: string
        document_type_id: string | null
        isNewDocumentType: boolean
        existingCitizenId: string | null
      }>
      ignoredItems: Array<{
        rg: string | null
        status: string
        errorReason: string | null
      }>
      handleProcessText: () => Promise<void>
    }

    vm.rawText = [
      '1342-5\t49770365-8\tCAROLINA SANTOS DA CRUZ\tAntecedentes Numeral',
      '1062-9\t52998224725\tMARIA FERNANDA SICOLI BRUNHARA\tTipo Especial Novo',
      '1062-9\t11864903-6\tANTONIO DE SOUZA LEITE\tSegunda Via',
      '1342-5\t14376013-0\tZÉLIA DE JESUS SILVA\tSegunda Via',
    ].join('\n')

    await vm.handleProcessText()
    await flushPromises()

    expect(vm.hasParsed).toBe(true)
    expect(vm.readyItems).toHaveLength(3)
    expect(vm.ignoredItems).toHaveLength(1)

    // Item 1: Existing document type, new citizen
    expect(vm.readyItems[0]?.document_type_id).toBe('dt-ant-num')
    expect(vm.readyItems[0]?.isNewDocumentType).toBe(false)

    // Item 2: CPF & new pending document type
    expect(vm.readyItems[1]?.cpf).toBe('529.982.247-25')
    expect(vm.readyItems[1]?.document_type_id).toBeNull()
    expect(vm.readyItems[1]?.isNewDocumentType).toBe(true)

    // Item 3 (in readyItems): Existing citizen without active demand
    expect(vm.readyItems[2]?.existingCitizenId).toBe('cit-inactive')

    // Ignored item: Citizen with active demand
    expect(vm.ignoredItems[0]?.status).toBe('active_demand_exists')
  })

  it('creates pending document types when needed and saves demands batch', async () => {
    mockCreatePendingDocumentType.mockResolvedValue({
      id: 'dt-new-pending',
      name: 'Tipo Especial Novo',
      is_active: false,
      is_pending: true,
    })

    mockCreateDemandsBatch.mockResolvedValue([
      {
        id: 'dem-1',
        station_code: '1342-5',
        iirgd_citizens: { name: 'CAROLINA SANTOS DA CRUZ', rg: '49770365-8' },
        iirgd_document_types: { name: 'Tipo Especial Novo' },
      },
    ])

    const wrapper = shallowMount(BatchDemandModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      isCompleted: boolean
      successfullySavedDemands: unknown[]
      handleProcessText: () => Promise<void>
      handleConfirmSave: () => Promise<void>
    }

    vm.rawText = '1342-5\t49770365-8\tCAROLINA SANTOS DA CRUZ\tTipo Especial Novo'

    await vm.handleProcessText()
    await flushPromises()

    await vm.handleConfirmSave()
    await flushPromises()

    expect(mockCreatePendingDocumentType).toHaveBeenCalledWith('Tipo Especial Novo')
    expect(mockCreateDemandsBatch).toHaveBeenCalledWith([
      {
        station_code: '1342-5',
        name: 'CAROLINA SANTOS DA CRUZ',
        rg: '49770365-8',
        cpf: null,
        document_type_id: 'dt-new-pending',
        existingCitizenId: null,
      },
    ])
    expect(vm.isCompleted).toBe(true)
    expect(vm.successfullySavedDemands).toHaveLength(1)
    expect(wrapper.emitted('created')?.[0]).toEqual([1])
  })
})
