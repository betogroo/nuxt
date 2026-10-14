/**
 * Utilitários para regras de cálculo de lances e apuração de vencedores.
 */

export interface BidItem {
  amount: number
  [key: string]: unknown
}

/**
 * Encontra o menor lance (vencedor) dentre uma lista de lances.
 * Retorna null caso a lista esteja vazia.
 */
export function getWinningBid<T extends BidItem>(bids: T[] | null | undefined): T | null {
  if (!bids || bids.length === 0) return null

  let minAmount = Infinity
  let winningBid: T | null = null

  for (const bid of bids) {
    if (typeof bid.amount === 'number' && bid.amount < minAmount) {
      minAmount = bid.amount
      winningBid = bid
    }
  }

  return winningBid
}

/**
 * Calcula o subtotal de um item com base no valor unitário e quantidade.
 */
export function getItemSubtotal(unitAmount: number, quantity: number | null | undefined): number {
  const qty = quantity && quantity > 0 ? quantity : 1
  return unitAmount * qty
}
