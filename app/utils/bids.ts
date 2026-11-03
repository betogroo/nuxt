/**
 * Utilitários para regras de cálculo de lances e apuração de vencedores.
 */

export type BidStatus = 'classified' | 'disqualified'

export const DISQUALIFICATION_REASON_ABOVE_REFERENCE = 'Valor ofertado acima do valor referencial.'

export interface BidItem {
  amount: number | string
  status?: BidStatus | string | null
  disqualification_reason?: string | null
  created_at?: string | null
  [key: string]: unknown
}

/**
 * Compara dois lances:
 * 1. Lances desclassificados são sempre posicionados no final.
 * 2. Compara por valor crescente (menor valor primeiro).
 * 3. Em caso de empate, pela ordem de cadastro (o mais antigo vence).
 */
export function compareBids(a: BidItem, b: BidItem): number {
  const isDisqualifiedA = a.status === 'disqualified'
  const isDisqualifiedB = b.status === 'disqualified'

  if (isDisqualifiedA !== isDisqualifiedB) {
    return isDisqualifiedA ? 1 : -1
  }

  const amountA = Number(a.amount)
  const amountB = Number(b.amount)

  if (amountA !== amountB) {
    return amountA - amountB
  }

  if (a.created_at && b.created_at) {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB
    }
  }

  return 0
}

/**
 * Encontra o menor lance classificado (vencedor) dentre uma lista de lances.
 * Em caso de empate no valor, vence o lance cadastrado primeiro (mais antigo).
 * Ignora lances com status 'disqualified'.
 * Retorna null caso não haja lances classificados.
 */
export function getWinningBid<T extends BidItem>(bids: T[] | null | undefined): T | null {
  if (!bids || bids.length === 0) return null

  let winningBid: T | null = null

  for (const bid of bids) {
    if (bid.status === 'disqualified') continue

    const numericAmount = Number(bid.amount)
    if (Number.isNaN(numericAmount)) continue

    if (!winningBid || compareBids(bid, winningBid) < 0) {
      winningBid = bid
    }
  }

  return winningBid
}

export interface FormatBidStatusOptions {
  isWinning?: boolean
}

/**
 * Formata o rótulo de exibição do status do lance.
 * - 'disqualified' -> 'Desclassificado'
 * - Caso isWinning seja false (demais lances válidos após o 1º colocado) -> 'Apto'
 * - Caso contrário (1º colocado / vencedor ou padrão) -> 'Classificado'
 */
export function formatBidStatus(status?: string | null, options?: FormatBidStatusOptions): string {
  if (status === 'disqualified') return 'Desclassificado'
  if (options?.isWinning === false) return 'Apto'
  return 'Classificado'
}

/**
 * Retorna a cor semântica correspondente ao status do lance.
 * - 'disqualified' -> 'error'
 * - isWinning === false -> 'info'
 * - Caso contrário -> 'success'
 */
export function getBidStatusColor(
  status?: string | null,
  options?: FormatBidStatusOptions,
): 'error' | 'success' | 'info' {
  if (status === 'disqualified') return 'error'
  if (options?.isWinning === false) return 'info'
  return 'success'
}

/**
 * Calcula o subtotal de um item com base no valor unitário e quantidade.
 */
export function getItemSubtotal(
  unitAmount: number | string,
  quantity: number | null | undefined,
): number {
  const numericAmount = Number(unitAmount) || 0
  const qty = quantity && quantity > 0 ? quantity : 1
  return numericAmount * qty
}

export type ItemDisputeOutcome = 'winner' | 'failed' | 'deserted'

export interface ItemDisputeResult<T extends BidItem = BidItem> {
  outcome: ItemDisputeOutcome
  label: string
  color: 'success' | 'error' | 'warning'
  winningBid: T | null
  winnerSupplierName?: string
  winningAmount?: number
  totalFinal?: number
}

/**
 * Apura o resultado do item na disputa:
 * - 'deserted' (Deserto): nenhum lance registrado (0 lances).
 * - 'failed' (Fracassado): lances registrados, mas todos foram desclassificados.
 * - 'winner' (Vencedor): possui pelo menos um lance classificado (o menor valor vence).
 */
export function getItemDisputeResult<
  T extends BidItem & { suppliers?: { company_name?: string; name?: string } | null },
>(item: { quantity?: number | null; demand_product_bids?: T[] | null }): ItemDisputeResult<T> {
  const bids = item.demand_product_bids || []
  if (!bids.length) {
    return {
      outcome: 'deserted',
      label: 'Deserto',
      color: 'warning',
      winningBid: null,
    }
  }

  const winning = getWinningBid(bids)
  if (!winning) {
    return {
      outcome: 'failed',
      label: 'Fracassado',
      color: 'error',
      winningBid: null,
    }
  }

  const numericAmount = Number(winning.amount) || 0
  const qty = Number(item.quantity) || 1
  return {
    outcome: 'winner',
    label: 'Vencedor',
    color: 'success',
    winningBid: winning,
    winnerSupplierName:
      winning.suppliers?.company_name || winning.suppliers?.name || 'Fornecedor Vencedor',
    winningAmount: numericAmount,
    totalFinal: numericAmount * qty,
  }
}
