import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCandidates } from '~/composables/useCandidates'

const selectMock = vi.fn()
const insertMock = vi.fn()
const updateMock = vi.fn()
const fromMock = vi.fn()
const logActionMock = vi.fn()

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()
const removeMock = vi.fn()

const storageFromMock = vi.fn().mockReturnValue({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
  remove: removeMock,
})

const supabaseMock = {
  from: fromMock,
  storage: {
    from: storageFromMock,
  },
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useCandidates Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uploadMock.mockResolvedValue({ data: { path: 'elec-1/10_123.png' }, error: null })
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          'https://supabase.co/storage/v1/object/public/candidate-photos/elec-1/10_123.png',
      },
    })
    removeMock.mockResolvedValue({ data: [], error: null })
  })

  it('fetchCandidates queries active candidates for given election ordered by number', async () => {
    const mockList = [
      { id: 'c1', name: 'Chapa 1', candidate_number: '10', photo_url: 'http://photo/1' },
      { id: 'c2', name: 'Chapa 2', candidate_number: '20', photo_url: 'http://photo/2' },
    ]

    const orderMock = vi.fn().mockResolvedValue({ data: mockList, error: null })
    const isMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ is: isMock })
    selectMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchCandidates } = useCandidates()
    const result = await fetchCandidates('elec-1')

    expect(fromMock).toHaveBeenCalledWith('candidates')
    expect(eqMock).toHaveBeenCalledWith('election_id', 'elec-1')
    expect(isMock).toHaveBeenCalledWith('deleted_at', null)
    expect(orderMock).toHaveBeenCalledWith('candidate_number', { ascending: true })
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Chapa 1')
  })

  it('createCandidate inserts candidate with generated random photo if photo_url is missing', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'c-new', name: 'Chapa 3', candidate_number: '30' },
      error: null,
    })
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock })
    insertMock.mockReturnValue({ select: selectAfterInsert })
    fromMock.mockReturnValue({ insert: insertMock })

    const { createCandidate } = useCandidates()
    const result = await createCandidate('elec-1', {
      name: 'Chapa 3',
      candidate_number: '30',
      photo_url: '',
    })

    expect(fromMock).toHaveBeenCalledWith('candidates')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        election_id: 'elec-1',
        name: 'Chapa 3',
        candidate_number: '30',
        photo_url: expect.stringContaining('picsum.photos'),
      }),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_CANDIDATE',
      expect.stringContaining('Chapa 3'),
    )
    expect(result.id).toBe('c-new')
  })

  it('createCandidate uploads photo file to Supabase Storage when provided', async () => {
    const file = new File(['image-bytes'], 'foto.png', { type: 'image/png' })
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'c-uploaded', name: 'Chapa Foto', candidate_number: '12' },
      error: null,
    })
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock })
    insertMock.mockReturnValue({ select: selectAfterInsert })
    fromMock.mockReturnValue({ insert: insertMock })

    const { createCandidate } = useCandidates()
    const result = await createCandidate('elec-1', {
      name: 'Chapa Foto',
      candidate_number: '12',
      photo_file: file,
    })

    expect(storageFromMock).toHaveBeenCalledWith('candidate-photos')
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining('elec-1/12_'),
      file,
      expect.objectContaining({ upsert: true }),
    )
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_url:
          'https://supabase.co/storage/v1/object/public/candidate-photos/elec-1/10_123.png',
      }),
    )
    expect(result.id).toBe('c-uploaded')
  })

  it('uploadCandidatePhoto uploads to bucket and returns public URL', async () => {
    const file = new File(['dummy'], 'foto.jpg', { type: 'image/jpeg' })
    const { uploadCandidatePhoto } = useCandidates()

    const url = await uploadCandidatePhoto(file, 'elec-10', '25')

    expect(storageFromMock).toHaveBeenCalledWith('candidate-photos')
    expect(uploadMock).toHaveBeenCalled()
    expect(getPublicUrlMock).toHaveBeenCalled()
    expect(url).toContain('candidate-photos')
  })

  it('deleteCandidatePhoto removes file when url belongs to candidate-photos bucket', async () => {
    const { deleteCandidatePhoto } = useCandidates()
    await deleteCandidatePhoto(
      'https://supabase.co/storage/v1/object/public/candidate-photos/elec-1/10_123.png',
    )

    expect(storageFromMock).toHaveBeenCalledWith('candidate-photos')
    expect(removeMock).toHaveBeenCalledWith(['elec-1/10_123.png'])
  })

  it('updateCandidate updates name, number, photo and logs action', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'c-upd', name: 'Chapa Atualizada', candidate_number: '11' },
      error: null,
    })
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectAfterUpdate })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { updateCandidate } = useCandidates()
    const result = await updateCandidate('c-upd', {
      name: 'Chapa Atualizada',
      candidate_number: '11',
    })

    expect(fromMock).toHaveBeenCalledWith('candidates')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Chapa Atualizada',
        candidate_number: '11',
      }),
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'c-upd')
    expect(logActionMock).toHaveBeenCalledWith('UPDATE_CANDIDATE', expect.stringContaining('c-upd'))
    expect(result.id).toBe('c-upd')
  })

  it('deleteCandidate performs safe delete by setting deleted_at', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { deleteCandidate } = useCandidates()
    await deleteCandidate('c-del')

    expect(fromMock).toHaveBeenCalledWith('candidates')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      }),
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'c-del')
    expect(logActionMock).toHaveBeenCalledWith(
      'DELETE_CANDIDATE',
      expect.stringContaining('safe delete'),
    )
  })
})
