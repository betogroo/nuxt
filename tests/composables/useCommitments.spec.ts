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
      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
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
      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
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
      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
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
              data: [
                {
                  id: 'item-1',
                  demand_product_bids: [{ id: 'b1', amount: 10, status: 'classified' }],
                },
                {
                  id: 'item-2',
                  demand_product_bids: [{ id: 'b2', amount: 20, status: 'classified' }],
                },
              ],
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

      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
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

  it('cancelCommitment successfully cancels commitment, updates linked items, creates history and inserts cancellation NL', async () => {
    const updateCommitmentEqMock = vi.fn().mockResolvedValue({ error: null })
    const insertNlMock = vi.fn().mockResolvedValue({ error: null })
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
                  status: 'commitment_confirmed',
                  bank_order_number: null,
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

      if (table === 'demand_commitment_liquidations') {
        return {
          insert: insertNlMock,
        }
      }

      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-1',
                  demand_product_bids: [{ id: 'b1', amount: 10, status: 'classified' }],
                },
                {
                  id: 'item-2',
                  demand_product_bids: [{ id: 'b2', amount: 20, status: 'classified' }],
                },
              ],
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

      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    })

    const { cancelCommitment } = useCommitments()

    await cancelCommitment({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      reason: 'Fornecedor não entregou os produtos no prazo legal',
      cancellationNlNumber: '2026nl00088',
      cancellationNlIssueDate: '2026-11-03',
      cancellationNlObservation: 'Estorno total de empenho',
    })

    expect(updateCommitmentEqMock).toHaveBeenCalledWith('id', 'comm-1')
    expect(insertNlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        commitment_id: 'comm-1',
        liquidation_number: '2026NL00088',
        is_cancellation: true,
      }),
    )
    expect(updateItemsInMock).toHaveBeenCalledWith('id', ['item-1', 'item-2'])
    expect(insertHistoryMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          demand_product_id: 'item-1',
          status: 'cancelled',
          commitment_number: '2026NE00313',
        }),
        expect.objectContaining({
          demand_product_id: 'item-2',
          status: 'cancelled',
          commitment_number: '2026NE00313',
        }),
      ]),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'CANCEL_COMMITMENT',
      expect.stringContaining('2026NE00313'),
      'user-1',
    )
  })

  it('cancelCommitment blocks cancellation when Ordem Bancária already exists', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'completed',
                  bank_order_number: '2026OB00001',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    })

    const { cancelCommitment } = useCommitments()

    await expect(
      cancelCommitment({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        reason: 'Tentativa de cancelamento',
      }),
    ).rejects.toThrow(/Não é permitido cancelar uma Nota de Empenho que já possui Ordem Bancária/)
  })

  it('blocks PD and OB when commitment is cancelled', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'cancelled',
                  bank_order_number: null,
                  disbursement_program_number: null,
                  demand_commitment_liquidations: [{ id: 'nl-1' }, { id: 'nl-2' }],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    })

    const { saveDisbursementProgram, saveBankOrderAndComplete } = useCommitments()

    await expect(
      saveDisbursementProgram({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        disbursementProgramNumber: '2026PD00001',
        issuedAt: '2026-11-01',
      }),
    ).rejects.toThrow(/Notas de Empenho canceladas não permitem registro de Programa de Desembolso/)

    await expect(
      saveBankOrderAndComplete({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        bankOrderNumber: '2026OB00001',
        issuedAt: '2026-11-01',
      }),
    ).rejects.toThrow(/Notas de Empenho canceladas não permitem emissão de Ordem Bancária/)
  })

  it('allows adding cancellation NL on a cancelled commitment even if not delivered', async () => {
    const insertSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'nl-canc-1',
        liquidation_number: '2026NL00077',
        is_cancellation: true,
      },
      error: null,
    })

    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'cancelled',
                  bank_order_number: null,
                },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'demand_commitment_liquidations') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: insertSingleMock,
            }),
          }),
        }
      }

      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    })

    const { addLiquidationNote } = useCommitments()

    const result = await addLiquidationNote({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      liquidationNumber: '2026NL00077',
      issueDate: '2026-11-03',
      observation: 'NL de Cancelamento posterior',
    })

    expect(result.liquidation_number).toBe('2026NL00077')
    expect(result.is_cancellation).toBe(true)
  })

  it('fetchCommitmentByNumber strictly excludes failed items and calculates total only for winning items', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  commitment_number: '2026NE00313',
                  supplier_id: 'sup-1',
                  demand_id: 'dem-1',
                  status: 'delivered',
                  demand_commitment_liquidations: [],
                },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'item-won',
                      quantity: 10,
                      commitment_number: '2026NE00313',
                      execution_status: 'delivered',
                      product_name_snapshot: 'Lacre para Malote',
                      demand_product_bids: [
                        {
                          id: 'bid-won',
                          supplier_id: 'sup-1',
                          amount: 14.7,
                          status: 'classified',
                        },
                      ],
                    },
                    {
                      id: 'item-failed',
                      quantity: 100,
                      commitment_number: '2026NE00313',
                      execution_status: 'delivered',
                      product_name_snapshot: 'Envelope Plástico 20 x 30',
                      demand_product_bids: [
                        {
                          id: 'bid-disq-1',
                          supplier_id: 'sup-other',
                          amount: 7.99,
                          status: 'disqualified',
                        },
                        {
                          id: 'bid-disq-2',
                          supplier_id: 'sup-1',
                          amount: 8.5,
                          status: 'disqualified',
                        },
                      ],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    })

    const { fetchCommitmentByNumber } = useCommitments()
    const detail = await fetchCommitmentByNumber('2026NE00313')

    expect(detail).not.toBeNull()
    // Failed item is excluded
    expect(detail!.items).toHaveLength(1)
    expect(detail!.items[0].id).toBe('item-won')
    expect(detail!.items[0].winning_unit_price).toBe(14.7)
    // Total reflects only winning item (10 * 14.70 = 147.00)
    expect(detail!.total_amount).toBe(147)
  })

  it('updateCommitmentLogisticsStatus detaches failed items and updates only valid winning items', async () => {
    const updateCommitmentEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateItemsInMock = vi.fn().mockResolvedValue({ error: null })
    const detachItemsInMock = vi.fn().mockResolvedValue({ error: null })
    const insertHistoryMock = vi.fn().mockResolvedValue({ error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          update: vi.fn().mockReturnValue({
            eq: updateCommitmentEqMock,
          }),
        }
      }

      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-won',
                  demand_product_bids: [{ id: 'b1', amount: 10, status: 'classified' }],
                },
                {
                  id: 'item-failed',
                  demand_product_bids: [{ id: 'b2', amount: 20, status: 'disqualified' }],
                },
              ],
              error: null,
            }),
          }),
          update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            if (payload.commitment_number === null) {
              return { in: detachItemsInMock }
            }
            return { in: updateItemsInMock }
          }),
        }
      }

      if (table === 'demand_item_status_history') {
        return {
          insert: insertHistoryMock,
        }
      }

      if (table === 'demand_item_status_history') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      return {}
    })

    const { updateCommitmentLogisticsStatus } = useCommitments()

    await updateCommitmentLogisticsStatus({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      status: 'delivered',
    })

    // Commitment status updated
    expect(updateCommitmentEqMock).toHaveBeenCalledWith('id', 'comm-1')
    // Failed item is detached
    expect(detachItemsInMock).toHaveBeenCalledWith('id', ['item-failed'])
    // Only winning item is updated to delivered
    expect(updateItemsInMock).toHaveBeenCalledWith('id', ['item-won'])
    // History inserted only for winning item
    expect(insertHistoryMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          demand_product_id: 'item-won',
          status: 'delivered',
        }),
      ]),
    )
  })

  it('blocks updateLiquidationNote when Ordem Bancária (OB) is present', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'completed',
                  bank_order_number: '2026OB00001',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { updateLiquidationNote } = useCommitments()

    await expect(
      updateLiquidationNote({
        liquidationId: 'nl-1',
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        liquidationNumber: '2026NL00001',
        issueDate: '2026-11-05',
      }),
    ).rejects.toThrow(
      /Não é permitido alterar Notas de Liquidação de um empenho concluído com Ordem Bancária/,
    )
  })

  it('updates liquidation note issue date and observation when no OB exists', async () => {
    const updateNlMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'nl-1',
              commitment_id: 'comm-1',
              liquidation_number: '2026NL00001',
              issue_date: '2026-11-05',
              observation: 'Data retificada',
            },
            error: null,
          }),
        }),
      }),
    })

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
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'demand_commitment_liquidations') {
        return {
          update: updateNlMock,
        }
      }
      return {}
    })

    const { updateLiquidationNote } = useCommitments()

    const result = await updateLiquidationNote({
      liquidationId: 'nl-1',
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      liquidationNumber: '2026NL00001',
      issueDate: '2026-11-05',
      observation: 'Data retificada',
    })

    expect(result.issue_date).toBe('2026-11-05')
    expect(updateNlMock).toHaveBeenCalledWith({
      issue_date: '2026-11-05',
      observation: 'Data retificada',
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_COMMITMENT_LIQUIDATION',
      expect.stringContaining('2026NL00001 atualizada'),
      'user-1',
    )
  })

  it('blocks removeDisbursementProgram when Ordem Bancária (OB) is present', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'completed',
                  disbursement_program_number: '2026PD00001',
                  bank_order_number: '2026OB00001',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { removeDisbursementProgram } = useCommitments()

    await expect(
      removeDisbursementProgram({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
      }),
    ).rejects.toThrow(
      /Não é possível excluir o Programa de Desembolso.*enquanto houver uma Ordem Bancária/,
    )
  })

  it('removes disbursement program when no OB is present', async () => {
    const updateCommitmentEq = vi.fn().mockResolvedValue({ error: null })
    const updateCommitment = vi.fn().mockReturnValue({ eq: updateCommitmentEq })

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
                },
                error: null,
              }),
            }),
          }),
          update: updateCommitment,
        }
      }
      return {}
    })

    const { removeDisbursementProgram } = useCommitments()

    await removeDisbursementProgram({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
    })

    expect(updateCommitment).toHaveBeenCalledWith(
      expect.objectContaining({
        disbursement_program_number: null,
        disbursement_program_issued_at: null,
        disbursement_program_observation: null,
      }),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'REMOVE_COMMITMENT_DISBURSEMENT_PROGRAM',
      expect.stringContaining('2026PD00001 removido'),
      'user-1',
    )
  })

  it('removes bank order, reverts commitment and linked items to delivered, and records history', async () => {
    const updateCommitmentEq = vi.fn().mockResolvedValue({ error: null })
    const updateCommitment = vi.fn().mockReturnValue({ eq: updateCommitmentEq })
    const updateItemsIn = vi.fn().mockResolvedValue({ error: null })
    const updateItems = vi.fn().mockReturnValue({ in: updateItemsIn })
    const insertHistory = vi.fn().mockResolvedValue({ error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-1',
                  status: 'completed',
                  bank_order_number: '2026OB00001',
                },
                error: null,
              }),
            }),
          }),
          update: updateCommitment,
        }
      }
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-1',
                  execution_status: 'completed',
                  quantity: 10,
                  demand_product_bids: [
                    { id: 'b1', supplier_id: 'sup-1', amount: 10, status: 'winner' },
                  ],
                },
              ],
              error: null,
            }),
          }),
          update: updateItems,
        }
      }
      if (table === 'demand_item_status_history') {
        return {
          insert: insertHistory,
        }
      }
      return {}
    })

    const { removeBankOrder } = useCommitments()

    await removeBankOrder({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
    })

    expect(updateCommitment).toHaveBeenCalledWith(
      expect.objectContaining({
        bank_order_number: null,
        status: 'delivered',
      }),
    )
    expect(updateItems).toHaveBeenCalledWith(
      expect.objectContaining({
        execution_status: 'delivered',
      }),
    )
    expect(updateItemsIn).toHaveBeenCalledWith('id', ['item-1'])
    expect(insertHistory).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          demand_product_id: 'item-1',
          status: 'delivered',
        }),
      ]),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'REMOVE_COMMITMENT_BANK_ORDER',
      expect.stringContaining('2026OB00001 removida'),
      'user-1',
    )
  })
})
