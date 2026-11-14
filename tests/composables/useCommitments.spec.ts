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
    const updateCommitmentSpy = vi.fn().mockReturnValue({
      eq: updateEqMock,
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
                  demand_commitment_liquidations: [{ id: 'nl-1' }, { id: 'nl-2' }],
                },
                error: null,
              }),
            }),
          }),
          update: updateCommitmentSpy,
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
      paidAt: '2026-11-05',
      observation: 'PD emitido',
    })

    expect(updateCommitmentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        disbursement_program_number: '2026PD00001',
        disbursement_program_issued_at: '2026-11-01',
        disbursement_program_paid_at: '2026-11-05',
        disbursement_program_observation: 'PD emitido',
      }),
    )
    expect(updateEqMock).toHaveBeenCalledWith('id', 'comm-1')
    expect(logActionMock).toHaveBeenCalledWith(
      'SAVE_COMMITMENT_DISBURSEMENT_PROGRAM',
      expect.stringContaining('2026PD00001'),
      'user-1',
    )
  })

  it('automatically closes commitment and all linked items as completed when Ordem Bancária (OB) is saved', async () => {
    const updateCommitmentEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateCommitmentSpy = vi.fn().mockReturnValue({
      eq: updateCommitmentEqMock,
    })
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
          update: updateCommitmentSpy,
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
      bankOrderNumber: '2026obc2148',
      issuedAt: '2026-11-01',
      paidAt: '2026-11-06',
      observation: 'Pago',
    })

    expect(updateCommitmentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bank_order_number: '2026OBC2148',
        bank_order_issued_at: '2026-11-01',
        bank_order_paid_at: '2026-11-06',
        bank_order_observation: 'Pago',
      }),
    )
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
      expect.stringContaining('2026OBC2148'),
      'user-1',
    )
  })

  it('cancelCommitment successfully cancels commitment, updates linked items, creates history and inserts cancellation NE', async () => {
    const updateCommitmentEqMock = vi.fn().mockResolvedValue({ error: null })
    const insertCommitmentMock = vi.fn().mockResolvedValue({ error: null })
    const updateItemsInMock = vi.fn().mockResolvedValue({ error: null })
    const insertHistoryMock = vi.fn().mockResolvedValue({ error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, _val: string) => {
              if (col === 'id') {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'comm-1',
                      demand_id: 'dem-1',
                      supplier_id: 'sup-1',
                      expense_nature_id: '339030',
                      status: 'commitment_confirmed',
                      bank_order_number: null,
                    },
                    error: null,
                  }),
                }
              }
              // check if cancellation NE already exists
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: updateCommitmentEqMock,
          }),
          insert: insertCommitmentMock,
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

      return {}
    })

    const { cancelCommitment } = useCommitments()

    await cancelCommitment({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      reason: 'Fornecedor não entregou os produtos no prazo legal',
      cancellationCommitmentNumber: '2026ne00088',
      cancellationIssueDate: '2026-11-03',
      cancellationObservation: 'Estorno total de empenho',
    })

    expect(updateCommitmentEqMock).toHaveBeenCalledWith('id', 'comm-1')
    expect(insertCommitmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        commitment_number: '2026NE00088',
        cancels_commitment_number: '2026NE00313',
        status: 'cancelled',
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
        cancellationCommitmentNumber: '2026NE00099',
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

  it('blocks adding NL on a cancelled commitment', async () => {
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

      return {}
    })

    const { addLiquidationNote } = useCommitments()

    await expect(
      addLiquidationNote({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        liquidationNumber: '2026NL00077',
        issueDate: '2026-11-03',
      }),
    ).rejects.toThrow(/Notas de Empenho canceladas não permitem registro de Notas de Liquidação/)
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
          select: vi.fn().mockImplementation((fields?: string) => {
            if (fields === 'id') {
              return {
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        { id: 'item-first-in-demand' },
                        { id: 'item-won' },
                        { id: 'item-failed' },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }
            }
            return {
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
            }
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
    expect(detail!.items[0].demand_item_number).toBe(2)
    expect(detail!.items[0].winning_unit_price).toBe(14.7)
    // Total reflects only winning item (10 * 14.70 = 147.00)
    expect(detail!.total_amount).toBe(147)
  })

  it('fetchCommitmentByNumber loads original items when commitment is a cancellation NE', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'demand_commitments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'comm-canc-2',
                  commitment_number: '2026NE00099',
                  cancels_commitment_number: '2026NE00313',
                  supplier_id: 'sup-1',
                  demand_id: 'dem-1',
                  status: 'cancelled',
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
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'id') {
              return {
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [{ id: 'item-won' }],
                      error: null,
                    }),
                  }),
                }),
              }
            }
            return {
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                expect(val).toBe('2026NE00313')
                return {
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'item-won',
                          quantity: 5,
                          commitment_number: '2026NE00313',
                          execution_status: 'cancelled',
                          product_name_snapshot: 'Item Cancelado',
                          demand_product_bids: [
                            {
                              id: 'bid-1',
                              supplier_id: 'sup-1',
                              amount: 20.0,
                              status: 'classified',
                            },
                          ],
                        },
                      ],
                      error: null,
                    }),
                  }),
                }
              }),
            }
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
    const detail = await fetchCommitmentByNumber('2026NE00099')

    expect(detail).not.toBeNull()
    expect(detail!.commitment.commitment_number).toBe('2026NE00099')
    expect(detail!.commitment.cancels_commitment_number).toBe('2026NE00313')
    expect(detail!.items).toHaveLength(1)
    expect(detail!.items[0].id).toBe('item-won')
    expect(detail!.total_amount).toBe(100)
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
        disbursement_program_paid_at: null,
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
        disbursement_program_paid_at: null,
        bank_order_number: null,
        bank_order_issued_at: null,
        bank_order_paid_at: null,
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

  it('blocks NL de Retenção de IR when supplier is Simples Nacional optant (is_simples_optant === true)', async () => {
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
                  suppliers: {
                    id: 'sup-1',
                    is_simples_optant: true,
                  },
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { addLiquidationNote } = useCommitments()

    await expect(
      addLiquidationNote({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        liquidationNumber: '2026NL00015',
        issueDate: '2026-11-05',
        isIrRetention: true,
        irRetentionAmount: 24.5,
      }),
    ).rejects.toThrow(
      /Fornecedores optantes pelo Simples Nacional não permitem cadastro de NL de Retenção de IR/,
    )
  })

  it('requires irRetentionAmount > 0 when adding NL de Retenção de IR and saves it for non-Simples supplier', async () => {
    const insertNlSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'nl-ir-1',
            commitment_id: 'comm-1',
            liquidation_number: '2026NL00015',
            issue_date: '2026-11-05',
            is_ir_retention: true,
            ir_retention_amount: 24.5,
          },
          error: null,
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
                  suppliers: {
                    id: 'sup-1',
                    is_simples_optant: false,
                  },
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'demand_commitment_liquidations') {
        return {
          insert: insertNlSpy,
        }
      }
      return {}
    })

    const { addLiquidationNote } = useCommitments()

    await expect(
      addLiquidationNote({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        liquidationNumber: '2026NL00015',
        issueDate: '2026-11-05',
        isIrRetention: true,
        irRetentionAmount: 0,
      }),
    ).rejects.toThrow(/É obrigatório informar o valor da retenção para NL de Retenção de IR/)

    const inserted = await addLiquidationNote({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      liquidationNumber: '2026nl00015',
      issueDate: '2026-11-05',
      isIrRetention: true,
      irRetentionAmount: '24,50',
    })

    expect(inserted.is_ir_retention).toBe(true)
    expect(inserted.ir_retention_amount).toBe(24.5)
    expect(insertNlSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        liquidation_number: '2026NL00015',
        is_ir_retention: true,
        ir_retention_amount: 24.5,
      }),
    )
  })

  it('does not count NL de Retenção de IR toward the minimum of 2 ordinary NLs required for PD', async () => {
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
                  demand_commitment_liquidations: [
                    { id: 'nl-1', is_cancellation: false, is_ir_retention: false },
                    { id: 'nl-ir', is_cancellation: false, is_ir_retention: true },
                  ],
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
        issuedAt: '2026-11-05',
      }),
    ).rejects.toThrow(/mínimo 2 Notas de Liquidação/)
  })

  it('allows removing an IR retention NL even when PD exists and exactly 2 ordinary NLs remain', async () => {
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null })

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
                  demand_commitment_liquidations: [
                    { id: 'nl-1', is_cancellation: false, is_ir_retention: false },
                    { id: 'nl-2', is_cancellation: false, is_ir_retention: false },
                    { id: 'nl-ir', is_cancellation: false, is_ir_retention: true },
                  ],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'demand_commitment_liquidations') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: deleteEqMock,
          }),
        }
      }
      return {}
    })

    const { removeLiquidationNote } = useCommitments()

    await removeLiquidationNote({
      liquidationId: 'nl-ir',
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      liquidationNumber: '2026NL00015',
    })

    expect(deleteEqMock).toHaveBeenCalledWith('id', 'nl-ir')
  })

  it('completes commitment and items when saveDisbursementProgram receives paidAt and bankOrderNumber', async () => {
    const updateCommitmentEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateCommitmentSpy = vi.fn().mockReturnValue({
      eq: updateCommitmentEqMock,
    })
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
                  bank_order_number: null,
                  demand_commitment_liquidations: [
                    { id: 'nl-1', is_cancellation: false, is_ir_retention: false },
                    { id: 'nl-2', is_cancellation: false, is_ir_retention: false },
                  ],
                },
                error: null,
              }),
            }),
          }),
          update: updateCommitmentSpy,
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
      return {}
    })

    const { saveDisbursementProgram } = useCommitments()

    await saveDisbursementProgram({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
      disbursementProgramNumber: '2026pd00010',
      issuedAt: '2026-04-20',
      paidAt: '2026-04-24',
      bankOrderNumber: '2026ob00777',
      observation: 'Pago com OB',
    })

    expect(updateCommitmentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        disbursement_program_number: '2026PD00010',
        disbursement_program_issued_at: '2026-04-20',
        disbursement_program_paid_at: '2026-04-24',
        bank_order_number: '2026OB00777',
        bank_order_issued_at: '2026-04-24',
        bank_order_paid_at: '2026-04-24',
        status: 'completed',
      }),
    )
    expect(updateItemsInMock).toHaveBeenCalledWith('id', ['item-1'])
  })

  describe('addMultipleLiquidationNotes', () => {
    it('throws error when items array is empty', async () => {
      const { addMultipleLiquidationNotes } = useCommitments()

      await expect(
        addMultipleLiquidationNotes({
          commitmentId: 'comm-1',
          commitmentNumber: '2026NE00313',
          issueDate: '2026-11-05',
          items: [],
        }),
      ).rejects.toThrow('Nenhuma Nota de Liquidação informada para cadastro.')
    })

    it('throws error when any liquidation number is invalid SIAFEM format', async () => {
      const { addMultipleLiquidationNotes } = useCommitments()

      await expect(
        addMultipleLiquidationNotes({
          commitmentId: 'comm-1',
          commitmentNumber: '2026NE00313',
          issueDate: '2026-11-05',
          items: [{ liquidationNumber: 'invalid-nl' }],
        }),
      ).rejects.toThrow(/deve seguir o padrão SIAFEM: 2026NL00000/)
    })

    it('throws error when duplicate numbers are supplied in the same batch', async () => {
      const { addMultipleLiquidationNotes } = useCommitments()

      await expect(
        addMultipleLiquidationNotes({
          commitmentId: 'comm-1',
          commitmentNumber: '2026NE00313',
          issueDate: '2026-11-05',
          items: [{ liquidationNumber: '2026NL00045' }, { liquidationNumber: '2026nl00045' }],
        }),
      ).rejects.toThrow(/foi informado mais de uma vez no mesmo cadastro/)
    })

    it('throws error when a number is already registered in the commitment', async () => {
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
                    suppliers: { id: 'supp-1', is_simples_optant: true },
                    demand_commitment_liquidations: [
                      { id: 'nl-1', liquidation_number: '2026NL00045' },
                    ],
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const { addMultipleLiquidationNotes } = useCommitments()

      await expect(
        addMultipleLiquidationNotes({
          commitmentId: 'comm-1',
          commitmentNumber: '2026NE00313',
          issueDate: '2026-11-05',
          items: [{ liquidationNumber: '2026NL00045' }, { liquidationNumber: '2026NL00046' }],
        }),
      ).rejects.toThrow(/já está cadastrada nesta Nota de Empenho/)
    })

    it('successfully inserts 4 ordinary NLs for Simples Nacional supplier', async () => {
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'nl-1', liquidation_number: '2026NL00045', is_ir_retention: false },
            { id: 'nl-2', liquidation_number: '2026NL00046', is_ir_retention: false },
            { id: 'nl-3', liquidation_number: '2026NL00078', is_ir_retention: false },
            { id: 'nl-4', liquidation_number: '2026NL00079', is_ir_retention: false },
          ],
          error: null,
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
                    suppliers: { id: 'supp-1', is_simples_optant: true },
                    demand_commitment_liquidations: [],
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'demand_commitment_liquidations') {
          return {
            insert: insertSpy,
          }
        }
        return {}
      })

      const { addMultipleLiquidationNotes } = useCommitments()

      const result = await addMultipleLiquidationNotes({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        issueDate: '2026-11-05',
        items: [
          { liquidationNumber: '2026nl00045' },
          { liquidationNumber: '2026nl00046' },
          { liquidationNumber: '2026nl00078' },
          { liquidationNumber: '2026nl00079' },
        ],
      })

      expect(result).toHaveLength(4)
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            commitment_id: 'comm-1',
            liquidation_number: '2026NL00045',
            is_ir_retention: false,
          }),
          expect.objectContaining({
            commitment_id: 'comm-1',
            liquidation_number: '2026NL00079',
            is_ir_retention: false,
          }),
        ]),
      )
      expect(logActionMock).toHaveBeenCalledWith(
        'ADD_MULTIPLE_COMMITMENT_LIQUIDATIONS',
        expect.stringContaining('4 Notas de Liquidação'),
        'user-1',
      )
    })

    it('successfully inserts 4 ordinary NLs + 1 IR retention NL for non-Simples supplier', async () => {
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'nl-1', liquidation_number: '2026NL00045', is_ir_retention: false },
            { id: 'nl-2', liquidation_number: '2026NL00046', is_ir_retention: false },
            { id: 'nl-3', liquidation_number: '2026NL00078', is_ir_retention: false },
            { id: 'nl-4', liquidation_number: '2026NL00079', is_ir_retention: false },
            {
              id: 'nl-5',
              liquidation_number: '2026NL00080',
              is_ir_retention: true,
              ir_retention_amount: 120,
            },
          ],
          error: null,
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
                    suppliers: { id: 'supp-2', is_simples_optant: false },
                    demand_commitment_liquidations: [],
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'demand_commitment_liquidations') {
          return {
            insert: insertSpy,
          }
        }
        return {}
      })

      const { addMultipleLiquidationNotes } = useCommitments()

      const result = await addMultipleLiquidationNotes({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        issueDate: '2026-11-05',
        items: [
          { liquidationNumber: '2026nl00045' },
          { liquidationNumber: '2026nl00046' },
          { liquidationNumber: '2026nl00078' },
          { liquidationNumber: '2026nl00079' },
          {
            liquidationNumber: '2026nl00080',
            isIrRetention: true,
            irRetentionAmount: '120,00',
          },
        ],
      })

      expect(result).toHaveLength(5)
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            liquidation_number: '2026NL00080',
            is_ir_retention: true,
            ir_retention_amount: 120,
          }),
        ]),
      )
    })
  })
})
