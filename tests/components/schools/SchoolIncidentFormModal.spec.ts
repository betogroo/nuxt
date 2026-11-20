import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SchoolIncidentFormModal from '~/components/schools/SchoolIncidentFormModal.vue'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const createIncidentMock = vi.fn()
const isSavingRef = ref(false)

mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

mockNuxtImport('useSchoolIncidents', () => () => ({
  createIncident: createIncidentMock,
  isSaving: isSavingRef,
}))

describe('SchoolIncidentFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSavingRef.value = false
    createIncidentMock.mockResolvedValue({ id: 'inc-123' })
  })

  it('initializes with default state and 1 offender', () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: {
        modelValue: true,
      },
    })

    const vm = wrapper.vm as unknown as {
      title: string
      description: string
      termsAccepted: boolean
      offenders: Array<{ name: string; classroom: string }>
      victims: Array<{ name: string; classroom: string }>
      isValid: boolean
    }

    expect(vm.title).toBe('')
    expect(vm.description).toBe('')
    expect(vm.termsAccepted).toBe(false)
    expect(vm.offenders).toHaveLength(1)
    expect(vm.victims).toHaveLength(0)
    expect(vm.isValid).toBe(false)
  })

  it('allows adding and removing offenders (maintaining at least 1)', () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: { modelValue: true },
    })

    const vm = wrapper.vm as unknown as {
      offenders: Array<{ name: string; classroom: string }>
      addOffender: () => void
      removeOffender: (index: number) => void
    }

    vm.addOffender()
    expect(vm.offenders).toHaveLength(2)

    vm.removeOffender(1)
    expect(vm.offenders).toHaveLength(1)

    // Cannot remove the last remaining offender
    vm.removeOffender(0)
    expect(vm.offenders).toHaveLength(1)
  })

  it('allows adding and removing victims', () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: { modelValue: true },
    })

    const vm = wrapper.vm as unknown as {
      victims: Array<{ name: string; classroom: string }>
      addVictim: () => void
      removeVictim: (index: number) => void
    }

    expect(vm.victims).toHaveLength(0)
    vm.addVictim()
    expect(vm.victims).toHaveLength(1)

    vm.removeVictim(0)
    expect(vm.victims).toHaveLength(0)
  })

  it('inserts mention tags into the description', () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: { modelValue: true },
    })

    const vm = wrapper.vm as unknown as {
      description: string
      insertMention: (tag: string) => void
    }

    vm.insertMention('@Carlos')
    expect(vm.description).toBe('@Carlos ')

    vm.insertMention('/Mariana')
    expect(vm.description).toBe('@Carlos /Mariana ')
  })

  it('validates form requirement: title, offender name, description and termsAccepted', () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: { modelValue: true },
    })

    const vm = wrapper.vm as unknown as {
      title: string
      description: string
      termsAccepted: boolean
      offenders: Array<{ name: string; classroom: string }>
      isValid: boolean
    }

    expect(vm.isValid).toBe(false)

    vm.title = 'Incidente na biblioteca'
    expect(vm.isValid).toBe(false)

    vm.offenders[0] = { name: 'Joãozinho', classroom: '5º Ano A' }
    expect(vm.isValid).toBe(false)

    vm.description = 'O @Joãozinho pegou os livros sem autorização.'
    expect(vm.isValid).toBe(false)

    vm.termsAccepted = true
    expect(vm.isValid).toBe(true)
  })

  it('submits form successfully and emits saved', async () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: { modelValue: true },
    })

    const vm = wrapper.vm as unknown as {
      title: string
      description: string
      termsAccepted: boolean
      offenders: Array<{ name: string; classroom: string }>
      victims: Array<{ name: string; classroom: string }>
      handleSubmit: () => Promise<void>
    }

    vm.title = 'Desentendimento no recreio'
    vm.offenders = [{ name: 'Carlos Daniel', classroom: '3º B' }]
    vm.victims = [{ name: 'Lucas Gabriel', classroom: '4º A' }]
    vm.description = 'O @Carlos Daniel empurrou o /Lucas Gabriel'
    vm.termsAccepted = true

    await vm.handleSubmit()

    expect(createIncidentMock).toHaveBeenCalledWith({
      title: 'Desentendimento no recreio',
      description: 'O @Carlos Daniel empurrou o /Lucas Gabriel',
      terms_accepted: true,
      offenders: [{ name: 'Carlos Daniel', classroom: '3º B' }],
      victims: [{ name: 'Lucas Gabriel', classroom: '4º A' }],
    })

    expect(toastSuccessMock).toHaveBeenCalledWith('Ocorrência registrada com sucesso!')
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('integrates mention autocomplete on typing @ and selecting an offender', () => {
    const wrapper = shallowMount(SchoolIncidentFormModal, {
      props: { modelValue: true },
    })

    const vm = wrapper.vm as unknown as {
      description: string
      offenders: Array<{ name: string; classroom: string }>
      isMentionMenuOpen: boolean
      mentionTriggerType: string
      onInputTextarea: (e: Event) => void
      onSelectOptionClick: (opt: { name: string; classroom: string }) => void
    }

    vm.offenders = [{ name: 'Lucas Silva', classroom: '3º B' }]
    vm.description = 'Durante a aula, o aluno @'

    vm.onInputTextarea({
      target: { selectionStart: vm.description.length },
    } as unknown as Event)

    expect(vm.isMentionMenuOpen).toBe(true)
    expect(vm.mentionTriggerType).toBe('offender')

    vm.onSelectOptionClick({ name: 'Lucas Silva', classroom: '3º B' })
    expect(vm.description).toBe('Durante a aula, o aluno @Lucas Silva ')
    expect(vm.isMentionMenuOpen).toBe(false)
  })
})
