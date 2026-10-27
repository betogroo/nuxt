import { formatCurrency, formatUnitPrice } from '~/utils/formatters'

export interface DemandTermsCharacteristic {
  value: string
  key?: {
    name: string
  } | null
}

export interface DemandTermsItem {
  id: string
  sort_order?: number | null
  product_name_snapshot?: string | null
  unit_name_snapshot?: string | null
  alias_name_snapshot?: string | null
  alias_code_snapshot?: number | null
  quantity: number
  reference_price?: number | null
  product?: {
    name?: string | null
    cat_mat?: number | null
    cat_bec?: number | null
    product_class_id?: string | null
    product_classes?: { id: string; name: string } | null
    product_characteristics?: DemandTermsCharacteristic[] | null
  } | null
  measurement_units?: { name: string } | null
  measurement_unit_aliases?: { name: string; code?: number | null } | null
}

export interface TermsOfReferenceTableOptions {
  includeCharacteristics?: boolean
  includePrices?: boolean
  codeDisplay?: 'both' | 'catmat' | 'catbec'
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Retorna exclusivamente a unidade de medida padrão (não alternativa)
 */
export function formatSupplyUnit(item: DemandTermsItem): string {
  return item.unit_name_snapshot || item.measurement_units?.name || '-'
}

/**
 * Retorna a classe do produto (id e nome)
 */
export function formatProductClass(item: DemandTermsItem): string {
  const pc = item.product?.product_classes
  if (!pc) return '-'
  if (pc.id && pc.name) {
    return `${pc.id} - ${pc.name}`
  }
  return pc.name || pc.id || '-'
}

export function formatItemCodes(
  item: DemandTermsItem,
  mode: 'both' | 'catmat' | 'catbec' = 'both',
): string {
  const mat = item.product?.cat_mat
  const bec = item.product?.cat_bec

  if (mode === 'catmat') {
    return mat ? String(mat) : '-'
  }
  if (mode === 'catbec') {
    return bec ? String(bec) : '-'
  }

  const parts: string[] = []
  if (mat) parts.push(`CATMAT: ${mat}`)
  if (bec) parts.push(`BEC: ${bec}`)

  return parts.length > 0 ? parts.join('<br>') : '-'
}

export function formatItemCodesPlainText(
  item: DemandTermsItem,
  mode: 'both' | 'catmat' | 'catbec' = 'both',
): string {
  const mat = item.product?.cat_mat
  const bec = item.product?.cat_bec

  if (mode === 'catmat') {
    return mat ? String(mat) : '-'
  }
  if (mode === 'catbec') {
    return bec ? String(bec) : '-'
  }

  const parts: string[] = []
  if (mat) parts.push(`CATMAT: ${mat}`)
  if (bec) parts.push(`BEC: ${bec}`)

  return parts.length > 0 ? parts.join(' / ') : '-'
}

/**
 * Gera tabela HTML formatada compatível com CKEditor 4 / compras.gov.br
 */
export function generateTermsOfReferenceTableHtml(
  items: DemandTermsItem[],
  options: TermsOfReferenceTableOptions = {},
): string {
  const { includeCharacteristics = true, includePrices = true, codeDisplay = 'both' } = options

  const tableStyle =
    'width: 100%; max-width: 672px; margin: 0 auto; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.4; color: #1f2937; border: 1px solid #cbd5e1;'
  const thStyle =
    'border: 1px solid #cbd5e1; padding: 7px 6px; font-weight: bold; background-color: #1e3a5f; color: #ffffff;'
  const tdBaseStyle = 'border: 1px solid #cbd5e1; padding: 6px 7px;'

  let totalAmount = 0

  const rowsHtml = items
    .map((item, index) => {
      const itemNumber = index + 1
      const isEven = index % 2 === 1
      const rowBg = isEven ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'

      const productName =
        item.product_name_snapshot || item.product?.name || 'Produto não identificado'
      const productClass = formatProductClass(item)
      const codeHtml = formatItemCodes(item, codeDisplay)
      const supplyUnit = formatSupplyUnit(item)
      const quantity = item.quantity || 0

      const unitPrice = item.reference_price ?? 0
      const subtotal = quantity * unitPrice
      totalAmount += subtotal

      let characteristicsHtml = ''
      const characteristics = item.product?.product_characteristics || []
      if (includeCharacteristics && characteristics.length > 0) {
        const charItems = characteristics
          .filter((c) => c && c.value)
          .map((c) => {
            const keyName = c.key?.name ? `${escapeHtml(c.key.name)}: ` : ''
            return `<li style="margin-bottom: 2px;"><strong>${keyName}</strong>${escapeHtml(c.value)}</li>`
          })
          .join('')

        if (charItems) {
          characteristicsHtml = `<ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 9pt; color: #374151; list-style-type: disc;">${charItems}</ul>`
        }
      }

      const pricesCells = includePrices
        ? `
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; vertical-align: top;">
          ${formatUnitPrice(unitPrice)}
        </td>
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; font-weight: 500; vertical-align: top;">
          ${formatCurrency(subtotal)}
        </td>`
        : ''

      return `
      <tr style="${rowBg}">
        <td style="${tdBaseStyle} text-align: center; font-weight: bold; vertical-align: top; width: 35px;">
          ${itemNumber}
        </td>
        <td style="${tdBaseStyle} text-align: left; vertical-align: top; width: 85px; font-size: 9pt;">
          ${escapeHtml(productClass)}
        </td>
        <td style="${tdBaseStyle} text-align: center; vertical-align: top; width: 75px; font-size: 9pt;">
          ${codeHtml}
        </td>
        <td style="${tdBaseStyle} text-align: left; vertical-align: top;">
          <div style="font-weight: 600; color: #0f172a;">${escapeHtml(productName)}</div>
          ${characteristicsHtml}
        </td>
        <td style="${tdBaseStyle} text-align: center; vertical-align: top; width: 75px; font-size: 9.5pt;">
          ${escapeHtml(supplyUnit)}
        </td>
        <td style="${tdBaseStyle} text-align: center; vertical-align: top; width: 45px;">
          ${quantity}
        </td>
        ${pricesCells}
      </tr>`
    })
    .join('')

  const priceHeaderCols = includePrices
    ? `
      <th style="${thStyle} text-align: right; width: 95px;">Valor Unit. (R$)</th>
      <th style="${thStyle} text-align: right; width: 105px;">Valor Total (R$)</th>`
    : ''

  const baseColSpan = 6
  const footerHtml = includePrices
    ? `
    <tfoot>
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td colspan="${baseColSpan}" style="${tdBaseStyle} text-align: right; font-size: 10pt; color: #0f172a; padding: 8px 10px;">
          Valor Total Estimado da Contratação:
        </td>
        <td colspan="2" style="${tdBaseStyle} text-align: right; font-size: 10.5pt; color: #1e3a5f; padding: 8px 8px; white-space: nowrap;">
          ${formatCurrency(totalAmount)}
        </td>
      </tr>
    </tfoot>`
    : ''

  return `<table style="${tableStyle}">
  <thead>
    <tr>
      <th style="${thStyle} text-align: center; width: 35px;">Item</th>
      <th style="${thStyle} text-align: left; width: 85px;">Classe</th>
      <th style="${thStyle} text-align: center; width: 75px;">Código</th>
      <th style="${thStyle} text-align: left;">Descrição do Objeto / Especificação Técnica</th>
      <th style="${thStyle} text-align: center; width: 75px;">Unidade</th>
      <th style="${thStyle} text-align: center; width: 45px;">Qtd.</th>
      ${priceHeaderCols}
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
  ${footerHtml}
</table>`
}

/**
 * Gera versão em texto simples tabulado para fallback
 */
export function generateTermsOfReferenceTableText(
  items: DemandTermsItem[],
  options: TermsOfReferenceTableOptions = {},
): string {
  const { includeCharacteristics = true, includePrices = true, codeDisplay = 'both' } = options

  const headers = [
    'Item',
    'Classe',
    'Código',
    'Descrição do Objeto / Especificação Técnica',
    'Unidade',
    'Qtd.',
  ]
  if (includePrices) {
    headers.push('Valor Unit. (R$)', 'Valor Total (R$)')
  }

  let totalAmount = 0
  const lines: string[] = [headers.join('\t')]

  items.forEach((item, index) => {
    const itemNumber = index + 1
    const productName =
      item.product_name_snapshot || item.product?.name || 'Produto não identificado'
    const productClass = formatProductClass(item)
    const codeText = formatItemCodesPlainText(item, codeDisplay)
    const supplyUnit = formatSupplyUnit(item)
    const quantity = item.quantity || 0

    const unitPrice = item.reference_price ?? 0
    const subtotal = quantity * unitPrice
    totalAmount += subtotal

    let desc = productName
    const characteristics = item.product?.product_characteristics || []
    if (includeCharacteristics && characteristics.length > 0) {
      const charTexts = characteristics
        .filter((c) => c && c.value)
        .map((c) => (c.key?.name ? `${c.key.name}: ${c.value}` : c.value))
      if (charTexts.length > 0) {
        desc += ` (${charTexts.join('; ')})`
      }
    }

    const row = [String(itemNumber), productClass, codeText, desc, supplyUnit, String(quantity)]
    if (includePrices) {
      row.push(formatUnitPrice(unitPrice), formatCurrency(subtotal))
    }
    lines.push(row.join('\t'))
  })

  if (includePrices) {
    lines.push(`\t\t\t\t\tTotal Estimado:\t\t${formatCurrency(totalAmount)}`)
  }

  return lines.join('\n')
}
