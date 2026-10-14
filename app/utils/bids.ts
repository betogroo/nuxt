/**
 * Utilitários para regras de cálculo de lances e apuração de vencedores.
 */

export interface BidItem {
  amount: number | string
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
    const numericAmount = Number(bid.amount)
    if (!Number.isNaN(numericAmount) && numericAmount < minAmount) {
      minAmount = numericAmount
      winningBid = bid
    }
  }

  return winningBid
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
