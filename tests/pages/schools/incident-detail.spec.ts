import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IncidentDetailPage from '~/pages/schools/incidents/[id].vue'
import type { SchoolIncident } from '~/types/school'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const mockRoute = ref({ params: { id: 'inc-1' } })
const pushMock = vi.fn()
mockNuxtImport('useRoute', () => () => mockRoute.value)
mockNuxtImport('useRouter', () => () => ({ push: pushMock }))

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

const isAdminRef = ref(false)
const canManageSchoolsMock = vi.fn().mockReturnValue(false)
mockNuxtImport('usePermissions', () => () => ({
  isAdmin: isAdminRef,
  canManageSchools: canManageSchoolsMock,
}))

const mockUserProfile = ref({
  id: 'user-manager',
  name: 'Gestor Escolar',
  role: 'school-manager',
})
mockNuxtImport('useProfile', () => () => ({
  profile: mockUserProfile,
}))

const mockIncidentData: SchoolIncident = {
  id: 'inc-1',
  title: 'Desentendimento no recreio',
  description: 'O aluno @Carlos empurrou a aluna /Mariana durante a saída.',
  status: 'new',
  terms_accepted: true,
  created_by: 'user-1',
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
  participants: [
    {
      id: 'p-1',
      incident_id: 'inc-1',
      role: 'offender',
      name: 'Carlos',
      classroom: '3º B',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'p-2',
      incident_id: 'inc-1',
      role: 'victim',
      name: 'Mariana',
      classroom: '4º A',
      created_at: '',
      updated_at: '',
    },
  ],
  author: {
    id: 'user-1',
    name: 'Professor Teste',
    role: 'school-user',
  },
}

const fetchIncidentByIdMock = vi.fn().mockResolvedValue(mockIncidentData)
const updateIncidentStatusMock = vi.fn().mockResolvedValue(undefined)
const deleteIncidentMock = vi.fn().mockResolvedValue(undefined)
const markIncidentAsReadMock = vi.fn().mockResolvedValue({
  ...mockIncidentData,
  read_at: '2026-11-20T11:00:00Z',
  read_by: 'manager-1',
  reader: { id: 'manager-1', name: 'Gestor Escolar', role: 'school-manager' },
})
const parseIncidentMentionsMock = vi.fn().mockReturnValue([
  { type: 'text', text: 'O aluno ' },
  { type: 'offender', text: 'Carlos', classroom: '3º B' },
  { type: 'text', text: ' empurrou a aluna ' },
  { type: 'victim', text: 'Mariana', classroom: '4º A' },
  { type: 'text', text: ' durante a saída.' },
])

mockNuxtImport('useSchoolIncidents', () => () => ({
  fetchIncidentById: fetchIncidentByIdMock,
  updateIncidentStatus: updateIncidentStatusMock,
  deleteIncident: deleteIncidentMock,
  markIncidentAsRead: markIncidentAsReadMock,
  parseIncidentMentions: parseIncidentMentionsMock,
  isLoading: ref(false),
  isSaving: ref(false),
}))

describe('IncidentDetailPage ([id].vue)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.value = { params: { id: 'inc-1' } }
    isAdminRef.value = false
    canManageSchoolsMock.mockReturnValue(false)
    fetchIncidentByIdMock.mockResolvedValue(mockIncidentData)
  })

  it('loads and renders incident details on mount', async () => {
    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiChip: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    // Aguarda execução do onMounted e promises
    await wrapper.vm.$nextTick()
    await Promise.resolve()

    expect(fetchIncidentByIdMock).toHaveBeenCalledWith('inc-1')
    const vm = wrapper.vm as unknown as {
      incident: SchoolIncident | null
      offenders: unknown[]
      victims: unknown[]
    }

    expect(vm.incident).toEqual(mockIncidentData)
    expect(vm.offenders).toHaveLength(1)
    expect(vm.victims).toHaveLength(1)
  })

  it('allows manager to change incident status', async () => {
    canManageSchoolsMock.mockReturnValue(true)

    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiChip: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await Promise.resolve()

    const vm = wrapper.vm as unknown as {
      canChangeStatus: boolean
      handleStatusChange: (status: string) => Promise<void>
    }

    expect(vm.canChangeStatus).toBe(true)
    await vm.handleStatusChange('under_review')

    expect(updateIncidentStatusMock).toHaveBeenCalledWith('inc-1', 'under_review')
    expect(toastSuccessMock).toHaveBeenCalledWith('Status da ocorrência atualizado!')
  })

  it('allows admin to delete incident with confirmation', async () => {
    isAdminRef.value = true
    window.confirm = vi.fn().mockReturnValue(true)

    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiChip: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await Promise.resolve()

    const vm = wrapper.vm as unknown as {
      isAdmin: boolean
      handleDelete: () => Promise<void>
    }

    expect(vm.isAdmin).toBe(true)
    await vm.handleDelete()

    expect(deleteIncidentMock).toHaveBeenCalledWith('inc-1')
    expect(toastSuccessMock).toHaveBeenCalledWith('Ocorrência excluída com sucesso!')
    expect(pushMock).toHaveBeenCalledWith('/schools/incidents')
  })

  it('displays error state when incident is not found', async () => {
    fetchIncidentByIdMock.mockResolvedValueOnce(null)

    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await Promise.resolve()

    const vm = wrapper.vm as unknown as {
      incident: SchoolIncident | null
      hasError: boolean
      errorMessage: string
    }

    expect(vm.incident).toBeNull()
    expect(vm.hasError).toBe(true)
    expect(vm.errorMessage).toContain('Ocorrência não encontrada')
  })

  it('marks unread incident as read when opened by school manager', async () => {
    canManageSchoolsMock.mockReturnValue(true)
    fetchIncidentByIdMock.mockResolvedValueOnce({
      ...mockIncidentData,
      read_at: null,
      read_by: null,
    })

    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiChip: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await Promise.resolve()

    expect(markIncidentAsReadMock).toHaveBeenCalledWith('inc-1')
  })

  it('does not mark incident as read if viewer is a standard school user', async () => {
    canManageSchoolsMock.mockReturnValue(false)
    fetchIncidentByIdMock.mockResolvedValueOnce({
      ...mockIncidentData,
      read_at: null,
      read_by: null,
    })

    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiChip: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await Promise.resolve()

    expect(markIncidentAsReadMock).not.toHaveBeenCalled()
  })

  it('does not mark incident as read if incident is already read', async () => {
    canManageSchoolsMock.mockReturnValue(true)
    fetchIncidentByIdMock.mockResolvedValueOnce({
      ...mockIncidentData,
      read_at: '2026-11-20T10:30:00Z',
      read_by: 'manager-1',
    })

    const wrapper = shallowMount(IncidentDetailPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiChip: true,
          UiButton: true,
          UiIcon: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await Promise.resolve()

    expect(markIncidentAsReadMock).not.toHaveBeenCalled()
  })
})
