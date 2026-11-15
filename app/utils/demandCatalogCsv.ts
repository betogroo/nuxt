import type { DemandProductRow } from '~/composables/useDemandProducts'
import { downloadFile } from '~/utils/download'
import { toSafeFilename } from '~/utils/reportFilename'

/**
 * Formata um campo de texto para o CSV do catálogo, aplicando aspas e escape de aspas
 * duplas se contiver ponto e vírgula, quebras de linha ou aspas.
 */
export function formatCatalogCsvField(val: string | number | null | undefined): string {
  if (val == null) return ''
  const str = String(val).trim()
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Formata o valor unitário de referência com vírgula nas casas decimais
 * sem aspas duplas, conforme padrão exigido: ex: 12,8976.
 */
export function formatCatalogUnitPrice(price: number | string | null | undefined): string {
  if (price == null || price === '') return ''
  const num = typeof price === 'number' ? price : Number(String(price).replace(',', '.'))
  if (isNaN(num)) return ''
  return String(num).replace('.', ',')
}

/**
 * Gera a string do arquivo CSV de catálogo dos itens da demanda com cabeçalho padrão,
 * separador por ponto e vírgula e BOM UTF-8 para compatibilidade com o Excel no Windows.
 */
export function buildDemandCatalogCsv(items: DemandProductRow[]): string {
  const header =
    'CODIGO_ITEM_CATALOGO;APELIDO;TIPO_ITEM_CATALOGO;DESCRICAO_UNIDADE;VALOR_UNITARIO;INFORMACOES_COMPLEMENTARES'

  const rows = (items || []).map((item) => {
    const catMat = item.product?.cat_mat != null ? String(item.product.cat_mat) : ''
    const productName = item.product?.name || item.product_name_snapshot || ''
    const unitName = item.measurement_units?.name || item.unit_name_snapshot || ''
    const unitPrice = formatCatalogUnitPrice(item.reference_price)

    return [
      formatCatalogCsvField(catMat),
      formatCatalogCsvField(productName),
      'MATERIAL',
      formatCatalogCsvField(unitName),
      unitPrice,
      formatCatalogCsvField(productName),
    ].join(';')
  })

  // Prefixo BOM UTF-8 (\uFEFF) para exibição sem mojibake no Excel
  return '\uFEFF' + [header, ...rows].join('\r\n')
}

/**
 * Dispara o download imediato do arquivo CSV de catálogo dos itens da demanda no navegador.
 */
export function downloadDemandCatalogCsv(params: {
  demand: {
    internal_process_number?: string | null
    name?: string | null
  }
  items: DemandProductRow[]
}): void {
  const csvContent = buildDemandCatalogCsv(params.items)
  const baseName = params.demand.internal_process_number || params.demand.name || 'demanda'
  const safeSlug = toSafeFilename(baseName, 'demanda')
  const filename = `catalogo-itens-${safeSlug}.csv`

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
}
