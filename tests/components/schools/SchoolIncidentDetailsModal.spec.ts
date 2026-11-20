import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SchoolIncidentDetailsModal from '~/components/schools/SchoolIncidentDetailsModal.vue'
import type { SchoolIncident } from '~/types/school'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const updateIncidentStatusMock = vi.fn()
const deleteIncidentMock = vi.fn()

const isAdminRef = ref(true)
const canManageSchoolsMock = vi.fn().mockReturnValue(true)

mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

mockNuxtImport('usePermissions', () => () => ({
  isAdmin: isAdminRef,
  canManageSchools: canManageSchoolsMock,
}))

mockNuxtImport('useSchoolIncidents', () => () => ({
  updateIncidentStatus: updateIncidentStatusMock,
  deleteIncident: deleteIncidentMock,
  isSaving: ref(false),
  parseIncidentMentions: (_text: string) => [
    { type: 'text', text: 'Relato: ' },
    { type: 'offender', text: '@Ofensor 1' },
    { type: 'text', text: ' e ' },
    { type: 'victim', text: '/Vitima 1' },
  ],
}))

describe('SchoolIncidentDetailsModal Component', () => {
  const mockIncident: SchoolIncident = {
    id: 'inc-99',
    title: 'Briga no corredor',
    description: 'Relato: @Ofensor 1 e /Vitima 1',
    status: 'new',
    terms_accepted: true,
    created_by: 'user-1',
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    participants: [
      {
        id: 'p-1',
        incident_id: 'inc-99',
        role: 'offender',
        name: 'Aluno Mau',
        classroom: '3º B',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'p-2',
        incident_id: 'inc-99',
        role: 'victim',
        name: 'Aluno Bom',
        classroom: '4º A',
        created_at: '',
        updated_at: '',
      },
    ],
    author: {
      id: 'user-1',
      name: 'Professor João',
      role: 'school-user',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    isAdminRef.value = true
    canManageSchoolsMock.mockReturnValue(true)
  })

  it('computes offenders and victims lists properly', () => {
    const wrapper = shallowMount(SchoolIncidentDetailsModal, {
      props: {
        modelValue: true,
        incident: mockIncident,
      },
    })

    const vm = wrapper.vm as unknown as {
      offenders: Array<{ name: string; role: string }>
      victims: Array<{ name: string; role: string }>
      canChangeStatus: boolean
    }

    expect(vm.offenders).toHaveLength(1)
    expect(vm.offenders[0].name).toBe('Aluno Mau')
    expect(vm.victims).toHaveLength(1)
    expect(vm.victims[0].name).toBe('Aluno Bom')
    expect(vm.canChangeStatus).toBe(true)
  })

  it('allows manager and admin to change status', async () => {
    const wrapper = shallowMount(SchoolIncidentDetailsModal, {
      props: {
        modelValue: true,
        incident: mockIncident,
      },
    })

    const vm = wrapper.vm as unknown as {
      handleStatusChange: (status: string) => Promise<void>
    }

    await vm.handleStatusChange('under_review')

    expect(updateIncidentStatusMock).toHaveBeenCalledWith('inc-99', 'under_review')
    expect(toastSuccessMock).toHaveBeenCalledWith('Status da ocorrência atualizado!')
    expect(wrapper.emitted('updated')).toBeTruthy()
  })

  it('allows admin to delete incident with confirmation', async () => {
    window.confirm = vi.fn().mockReturnValue(true)

    const wrapper = shallowMount(SchoolIncidentDetailsModal, {
      props: {
        modelValue: true,
        incident: mockIncident,
      },
    })

    const vm = wrapper.vm as unknown as {
      handleDelete: () => Promise<void>
    }

    await vm.handleDelete()

    expect(deleteIncidentMock).toHaveBeenCalledWith('inc-99')
    expect(toastSuccessMock).toHaveBeenCalledWith('Ocorrência excluída com sucesso!')
    expect(wrapper.emitted('deleted')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
