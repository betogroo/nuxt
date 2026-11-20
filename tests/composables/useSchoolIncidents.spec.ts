import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSchoolIncidents } from '~/composables/useSchoolIncidents'
import type { SchoolIncidentParticipant } from '~/types/school'

const mockUser = { id: 'user-123', email: 'school@test.com' }
const ensureUserMock = vi.fn().mockResolvedValue(mockUser)
const logActionMock = vi.fn().mockResolvedValue(undefined)

const selectMock = vi.fn()
const insertMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const orderMock = vi.fn()
const eqMock = vi.fn()
const singleMock = vi.fn()

const fromMock = vi.fn((_table: string) => {
  return {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }
})

mockNuxtImport('useSupabaseClient', () => () => ({
  from: fromMock,
}))

mockNuxtImport('useAuthSession', () => () => ({
  ensureUser: ensureUserMock,
}))

mockNuxtImport('useLogger', () => () => ({
  logAction: logActionMock,
}))

describe('useSchoolIncidents Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    orderMock.mockResolvedValue({ data: [], error: null })
    selectMock.mockReturnValue({
      order: orderMock,
      eq: eqMock,
      single: singleMock,
    })
    eqMock.mockReturnValue({
      single: singleMock,
    })
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'inc-1', title: 'Ocorrência Teste' },
          error: null,
        }),
      }),
    })
    updateMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    deleteMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  it('fetchIncidents queries school_incidents ordered by created_at DESC', async () => {
    const mockList = [
      {
        id: 'inc-1',
        title: 'Incidente 1',
        status: 'new',
        participants: [{ id: 'p-1', role: 'offender', name: 'Aluno A' }],
      },
    ]
    orderMock.mockResolvedValueOnce({ data: mockList, error: null })

    const { fetchIncidents, incidents } = useSchoolIncidents()
    const result = await fetchIncidents()

    expect(fromMock).toHaveBeenCalledWith('school_incidents')
    expect(result).toEqual(mockList)
    expect(incidents.value).toEqual(mockList)
  })

  it('createIncident validates required title', async () => {
    const { createIncident } = useSchoolIncidents()

    await expect(
      createIncident({
        title: '',
        description: 'Relato do ocorrido',
        terms_accepted: true,
        offenders: [{ name: 'Aluno 1' }],
      }),
    ).rejects.toThrow('O título da ocorrência é obrigatório.')
  })

  it('createIncident validates required description', async () => {
    const { createIncident } = useSchoolIncidents()

    await expect(
      createIncident({
        title: 'Briga no pátio',
        description: '   ',
        terms_accepted: true,
        offenders: [{ name: 'Aluno 1' }],
      }),
    ).rejects.toThrow('O histórico/relato da ocorrência é obrigatório.')
  })

  it('createIncident validates required terms acceptance', async () => {
    const { createIncident } = useSchoolIncidents()

    await expect(
      createIncident({
        title: 'Briga no pátio',
        description: 'Relato do ocorrido',
        terms_accepted: false,
        offenders: [{ name: 'Aluno 1' }],
      }),
    ).rejects.toThrow(
      'É obrigatório declarar a ciência dos termos e a não inserção de nomes de alunos no relato.',
    )
  })

  it('createIncident validates at least one offender is required', async () => {
    const { createIncident } = useSchoolIncidents()

    await expect(
      createIncident({
        title: 'Briga no pátio',
        description: 'Relato do ocorrido',
        terms_accepted: true,
        offenders: [],
      }),
    ).rejects.toThrow('É obrigatório cadastrar pelo menos um ofensor para a ocorrência.')
  })

  it('createIncident successfully inserts incident and participants and logs action', async () => {
    const createdIncidentData = {
      id: 'inc-10',
      title: 'Desentendimento no recreio',
      description: 'O @Carlos empurrou o /Lucas',
      status: 'new',
      terms_accepted: true,
      created_by: mockUser.id,
    }

    insertMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: createdIncidentData,
          error: null,
        }),
      }),
    })

    // Mock insert for participants
    insertMock.mockResolvedValueOnce({ error: null })

    const { createIncident } = useSchoolIncidents()

    const result = await createIncident({
      title: 'Desentendimento no recreio',
      description: 'O @Carlos empurrou o /Lucas',
      terms_accepted: true,
      offenders: [{ name: 'Carlos Daniel', classroom: '3º B' }],
      victims: [{ name: 'Lucas Gabriel', classroom: '4º A' }],
    })

    expect(result).toEqual(createdIncidentData)
    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_SCHOOL_INCIDENT',
      expect.stringContaining('Desentendimento no recreio'),
    )
  })

  it('updateIncidentStatus updates status and logs action', async () => {
    const { updateIncidentStatus } = useSchoolIncidents()

    await updateIncidentStatus('inc-10', 'in_progress')

    expect(fromMock).toHaveBeenCalledWith('school_incidents')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_SCHOOL_INCIDENT_STATUS',
      'Updated status of school incident inc-10 to in_progress',
    )
  })

  it('deleteIncident deletes incident and logs action', async () => {
    const { deleteIncident } = useSchoolIncidents()

    await deleteIncident('inc-10')

    expect(fromMock).toHaveBeenCalledWith('school_incidents')
    expect(logActionMock).toHaveBeenCalledWith(
      'DELETE_SCHOOL_INCIDENT',
      'Deleted school incident inc-10',
    )
  })

  it('parseIncidentMentions correctly parses @ and / tokens and associates with participants', () => {
    const { parseIncidentMentions } = useSchoolIncidents()

    const participants: SchoolIncidentParticipant[] = [
      {
        id: 'p-1',
        incident_id: 'inc-1',
        role: 'offender',
        name: 'Carlos Daniel',
        classroom: '3º Ano B',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'p-2',
        incident_id: 'inc-1',
        role: 'victim',
        name: 'Mariana Souza',
        classroom: '4º Ano A',
        created_at: '',
        updated_at: '',
      },
    ]

    const text = 'No pátio, o @Carlos Daniel agrediu verbalmente a /Mariana Souza durante a aula.'
    const tokens = parseIncidentMentions(text, participants)

    expect(tokens.length).toBe(5)
    expect(tokens[0]).toEqual({ type: 'text', text: 'No pátio, o ' })
    expect(tokens[1]).toEqual({
      type: 'offender',
      text: '@Carlos Daniel',
      label: 'Carlos Daniel',
      classroom: '3º Ano B',
    })
    expect(tokens[2]).toEqual({ type: 'text', text: ' agrediu verbalmente a ' })
    expect(tokens[3]).toEqual({
      type: 'victim',
      text: '/Mariana Souza',
      label: 'Mariana Souza',
      classroom: '4º Ano A',
    })
    expect(tokens[4]).toEqual({ type: 'text', text: ' durante a aula.' })
  })
})
