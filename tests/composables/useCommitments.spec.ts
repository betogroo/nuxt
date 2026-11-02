import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCommitments } from '~/composables/useCommitments'

const fromMock = vi.fn()
const logActionMock = vi.fn()

const supabaseMock = {
  from: fromMock,
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'user-1' } }))
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useCommitments Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks Programa de Desembolso (PD) registration when fewer than 2 Notas de Liquidação exist', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'delivered',
                  bank_order_number: null,
                  demand_commitment_liquidations: [{ id: 'nl-1' }], // Only 1 NL!
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { saveDisbursementProgram } = useCommitments()

    await expect(
      saveDisbursementProgram({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        disbursementProgramNumber: '2026PD00001',
        issuedAt: '2026-11-01',
      }),
    ).rejects.toThrow(/mínimo 2 Notas de Liquidação/)
  })

  it('blocks Programa de Desembolso (PD) when status is not delivered', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'shipped',
                  bank_order_number: null,
                  demand_commitment_liquidations: [{ id: 'nl-1' }, { id: 'nl-2' }],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { saveDisbursementProgram } = useCommitments()

    await expect(
      saveDisbursementProgram({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        disbursementProgramNumber: '2026PD00001',
        issuedAt: '2026-11-01',
      }),
    ).rejects.toThrow(/status "Entregue"/)
  })

  it('allows Programa de Desembolso (PD) when 2 or more Notas de Liquidação exist and status is delivered', async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'delivered',
                  bank_order_number: null,
                  demand_commitment_liquidations: [{ id: 'nl-1' }, { id: 'nl-2' }],
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: updateEqMock,
          }),
        }
      }
      return {}
    })

    const { saveDisbursementProgram } = useCommitments()

    await saveDisbursementProgram({
      commitmentId: 'comm-1',
      commitmentNumber: '2026ne00313',
      disbursementProgramNumber: '2026pd00001',
      issuedAt: '2026-11-01',
      observation: 'PD emitido',
    })

    expect(updateEqMock).toHaveBeenCalledWith('id', 'comm-1')
    expect(logActionMock).toHaveBeenCalledWith(
      'SAVE_COMMITMENT_DISBURSEMENT_PROGRAM',
      expect.stringContaining('2026PD00001'),
      'user-1',
    )
  })

  it('automatically closes commitment and all linked items as completed when Ordem Bancária (OB) is saved', async () => {
    const updateCommitmentEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateItemsInMock = vi.fn().mockResolvedValue({ error: null })
    const insertHistoryMock = vi.fn().mockResolvedValue({ error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'delivered',
                  disbursement_program_number: '2026PD00001',
                  bank_order_number: null,
                  demand_commitment_liquidations: [{ id: 'nl-1' }, { id: 'nl-2' }],
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: updateCommitmentEqMock,
          }),
        }
      }

      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'item-1' }, { id: 'item-2' }],
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            in: updateItemsInMock,
          }),
        }
      }

      if (table === 'demand_item_status_history') {
        return {
          insert: insertHistoryMock,
        }
      }

      return {}
    })

    const { saveBankOrderAndComplete } = useCommitments()

    await saveBankOrderAndComplete({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      bankOrderNumber: '2026ob00999',
      issuedAt: '2026-11-01',
      observation: 'Pago',
    })

    expect(updateCommitmentEqMock).toHaveBeenCalledWith('id', 'comm-1')
    expect(updateItemsInMock).toHaveBeenCalledWith('id', ['item-1', 'item-2'])
    expect(insertHistoryMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          demand_product_id: 'item-1',
          status: 'completed',
          commitment_number: '2026NE00313',
        }),
        expect.objectContaining({
          demand_product_id: 'item-2',
          status: 'completed',
          commitment_number: '2026NE00313',
        }),
      ]),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'COMPLETE_COMMITMENT_BANK_ORDER',
      expect.stringContaining('2026OB00999'),
      'user-1',
    )
  })
})
