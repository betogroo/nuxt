import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SupplierBatchAddModal from '~/components/suppliers/SupplierBatchAddModal.vue'

const mockCheckExistingSuppliersByCnpjs = vi.fn()
const mockCreateSuppliersBatch = vi.fn()

mockNuxtImport('useSuppliers', () => () => ({
  checkExistingSuppliersByCnpjs: mockCheckExistingSuppliersByCnpjs,
  createSuppliersBatch: mockCreateSuppliersBatch,
}))

describe('SupplierBatchAddModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckExistingSuppliersByCnpjs.mockResolvedValue(new Map())
  })

  it('inicia com campos limpos e redefine o estado quando fecha', async () => {
    const wrapper = shallowMount(SupplierBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      hasParsed: boolean
      isCompleted: boolean
    }

    vm.rawText = '00.000.000/0001-91\tEmpresa Teste'
    vm.hasParsed = true

    await wrapper.setProps({ modelValue: false })
    await flushPromises()

    expect(vm.rawText).toBe('')
    expect(vm.hasParsed).toBe(false)
    expect(vm.isCompleted).toBe(false)
  })

  it('exibe erro se tentar processar com texto em branco', async () => {
    const wrapper = shallowMount(SupplierBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      saveError: string
      handleProcessText: () => Promise<void>
    }

    vm.rawText = '   '
    await vm.handleProcessText()

    expect(vm.saveError).toContain('cole ou digite os dados')
  })

  it('processa o texto, verifica duplicidade no banco e separa itens novos dos já cadastrados', async () => {
    // Simula que 00000000000191 já existe no banco
    const existingMap = new Map()
    existingMap.set('00000000000191', {
      id: 'sup-existing',
      cnpj: '00.000.000/0001-91',
      company_name: 'Fornecedor Já Cadastrado LTDA',
    })
    mockCheckExistingSuppliersByCnpjs.mockResolvedValue(existingMap)

    const wrapper = shallowMount(SupplierBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      hasParsed: boolean
      readyItems: Array<{ cnpj: string; company_name: string; isValid: boolean }>
      ignoredItems: Array<{ cnpj: string; status: string; errorReason: string }>
      activeTab: string
      handleProcessText: () => Promise<void>
    }

    vm.rawText = [
      '00.000.000/0001-91\tFornecedor Alpha', // já existe no banco
      '33000167000101\tFornecedor Beta Novo', // novo e válido
      '12345\tFornecedor CNPJ Inválido', // inválido
    ].join('\n')

    await vm.handleProcessText()
    await flushPromises()

    expect(mockCheckExistingSuppliersByCnpjs).toHaveBeenCalledWith(
      expect.arrayContaining(['00000000000191', '33000167000101']),
    )

    expect(vm.hasParsed).toBe(true)
    expect(vm.readyItems).toHaveLength(1)
    expect(vm.readyItems[0].cnpj).toBe('33.000.167/0001-01')
    expect(vm.readyItems[0].company_name).toBe('Fornecedor Beta Novo')

    expect(vm.ignoredItems).toHaveLength(2)
    const existingItem = vm.ignoredItems.find((i) => i.status === 'already_registered')
    expect(existingItem).toBeDefined()
    expect(existingItem?.errorReason).toContain('já cadastrado')

    const invalidItem = vm.ignoredItems.find((i) => i.status === 'invalid_cnpj')
    expect(invalidItem).toBeDefined()
  })

  it('permite retornar à edição com handleBackToEdit', async () => {
    const wrapper = shallowMount(SupplierBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      hasParsed: boolean
      handleProcessText: () => Promise<void>
      handleBackToEdit: () => void
    }

    vm.rawText = '33000167000101\tEmpresa'
    await vm.handleProcessText()
    expect(vm.hasParsed).toBe(true)

    vm.handleBackToEdit()
    expect(vm.hasParsed).toBe(false)
  })

  it('cadastra fornecedores válidos, exibe relatório de conclusão e emite saved', async () => {
    mockCreateSuppliersBatch.mockResolvedValue([
      {
        id: 'new-1',
        cnpj: '33.000.167/0001-01',
        company_name: 'Fornecedor Beta Novo',
        is_active: true,
      },
    ])

    const wrapper = shallowMount(SupplierBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      isCompleted: boolean
      successfullySavedSuppliers: Array<{ id: string }>
      handleProcessText: () => Promise<void>
      handleConfirmSave: () => Promise<void>
    }

    vm.rawText = '33000167000101\tFornecedor Beta Novo'
    await vm.handleProcessText()
    await vm.handleConfirmSave()
    await flushPromises()

    expect(mockCreateSuppliersBatch).toHaveBeenCalledWith([
      { cnpj: '33.000.167/0001-01', company_name: 'Fornecedor Beta Novo' },
    ])

    expect(vm.isCompleted).toBe(true)
    expect(vm.successfullySavedSuppliers).toHaveLength(1)
    expect(wrapper.emitted('saved')).toBeDefined()
    expect(wrapper.emitted('saved')?.[0]).toEqual([1])
  })

  it('trata erro no salvamento sem travar', async () => {
    mockCreateSuppliersBatch.mockRejectedValue(new Error('Erro de conexão ao banco'))

    const wrapper = shallowMount(SupplierBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    const vm = wrapper.vm as unknown as {
      rawText: string
      saveError: string
      isCompleted: boolean
      handleProcessText: () => Promise<void>
      handleConfirmSave: () => Promise<void>
    }

    vm.rawText = '33000167000101\tFornecedor Beta Novo'
    await vm.handleProcessText()
    await vm.handleConfirmSave()
    await flushPromises()

    expect(vm.isCompleted).toBe(false)
    expect(vm.saveError).toContain('Erro de conexão ao banco')
  })
})
