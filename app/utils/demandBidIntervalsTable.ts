import { formatUnitPrice } from '~/utils/formatters'
import { escapeHtml } from '~/utils/reportHtml'

export interface DemandBidIntervalItem {
  id: string
  sort_order?: number | null
  product_name_snapshot?: string | null
  reference_price?: number | null
  bid_interval?: number | null
  bid_interval_type?: string | null
  product?: {
    name?: string | null
  } | null
}

/**
 * Retorna o valor do intervalo de lances formatado conforme o tipo (percentual ou monetário).
 */
export function formatBidIntervalValue(item: DemandBidIntervalItem): string {
  if (item.bid_interval == null || isNaN(Number(item.bid_interval)) || !item.bid_interval_type) {
    return '-'
  }
  const val = Number(item.bid_interval)
  if (item.bid_interval_type === 'percentage') {
    const formatted = val.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    return `${formatted}%`
  }
  if (item.bid_interval_type === 'monetary') {
    return formatUnitPrice(val)
  }
  return '-'
}

/**
 * Retorna o valor de referência unitário formatado.
 */
export function formatReferencePriceValue(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) {
    return '-'
  }
  return formatUnitPrice(value)
}

/**
 * Verifica se um produto específico possui tipo e valor de intervalo de lances válidos.
 */
export function isItemBidIntervalValid(item: DemandBidIntervalItem): boolean {
  return (
    item != null &&
    item.bid_interval != null &&
    !isNaN(Number(item.bid_interval)) &&
    Number(item.bid_interval) > 0 &&
    (item.bid_interval_type === 'percentage' || item.bid_interval_type === 'monetary')
  )
}

/**
 * Retorna os itens de uma lista que ainda não possuem intervalo válido cadastrado.
 */
export function getPendingBidIntervalItems(
  items: DemandBidIntervalItem[] = [],
): DemandBidIntervalItem[] {
  return items.filter((item) => !isItemBidIntervalValid(item))
}

/**
 * Retorna true se houver ao menos um produto e todos estiverem com os intervalos cadastrados.
 */
export function areAllBidIntervalsConfigured(items: DemandBidIntervalItem[] = []): boolean {
  if (!items || items.length === 0) return false
  return items.every(isItemBidIntervalValid)
}

/**
 * Gera a tabela HTML formatada compatível com o editor CKEditor 4 / Compras.gov.br e Word/Excel.
 * Colunas: Item | Nome | Valor de Referência | Intervalo entre lances
 */
export function generateBidIntervalsTableHtml(items: DemandBidIntervalItem[] = []): string {
  const tableStyle =
    'width: 100%; max-width: 672px; margin: 0 auto; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.4; color: #1f2937; border: 1px solid #cbd5e1;'
  const thStyle =
    'border: 1px solid #cbd5e1; padding: 7px 8px; font-weight: bold; background-color: #1e3a5f; color: #ffffff;'
  const tdBaseStyle = 'border: 1px solid #cbd5e1; padding: 6px 8px;'

  const rowsHtml = items
    .map((item, index) => {
      const itemNumber = index + 1
      const isEven = index % 2 === 1
      const rowBg = isEven ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'

      const productName =
        item.product_name_snapshot || item.product?.name || 'Produto não identificado'
      const refPriceStr = formatReferencePriceValue(item.reference_price)
      const bidIntervalStr = formatBidIntervalValue(item)

      return `
      <tr style="${rowBg}">
        <td style="${tdBaseStyle} text-align: center; font-weight: bold; vertical-align: middle; width: 45px;">
          ${itemNumber}
        </td>
        <td style="${tdBaseStyle} text-align: left; vertical-align: middle;">
          <div style="font-weight: 600; color: #0f172a;">${escapeHtml(productName)}</div>
        </td>
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; vertical-align: middle; width: 140px;">
          ${refPriceStr}
        </td>
        <td style="${tdBaseStyle} text-align: center; white-space: nowrap; font-weight: 500; vertical-align: middle; width: 150px;">
          ${bidIntervalStr}
        </td>
      </tr>`
    })
    .join('')

  return `<table style="${tableStyle}">
  <thead>
    <tr>
      <th style="${thStyle} text-align: center; width: 45px;">Item</th>
      <th style="${thStyle} text-align: left;">Nome</th>
      <th style="${thStyle} text-align: right; width: 140px;">Valor de Referência</th>
      <th style="${thStyle} text-align: center; width: 150px;">Intervalo entre lances</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>`
}

/**
 * Gera versão em texto simples tabulado (TSV) para colagem direta em planilhas ou editores.
 */
export function generateBidIntervalsTableText(items: DemandBidIntervalItem[] = []): string {
  const headers = ['Item', 'Nome', 'Valor de Referência', 'Intervalo entre lances']
  const lines: string[] = [headers.join('\t')]

  items.forEach((item, index) => {
    const itemNumber = index + 1
    const productName =
      item.product_name_snapshot || item.product?.name || 'Produto não identificado'
    const refPriceStr = formatReferencePriceValue(item.reference_price)
    const bidIntervalStr = formatBidIntervalValue(item)

    lines.push([String(itemNumber), productName, refPriceStr, bidIntervalStr].join('\t'))
  })

  return lines.join('\n')
}
