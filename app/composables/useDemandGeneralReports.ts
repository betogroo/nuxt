import type { Database } from '~/types/database.types'
import { downloadFile } from '~/utils/download'
import { escapeCsvField } from '~/utils/reportCsv'
import { toSafeFilename } from '~/utils/reportFilename'
import {
  appendPageFooters,
  createA4Doc,
  PDF_MARGIN_X_MM,
  PDF_PAGE_WIDTH_MM,
} from '~/utils/reportPdf'
import { formatCnpj, formatCurrency, formatDate } from '~/utils/formatters'
import { getItemDisputeResult, getItemSubtotal } from '~/utils/bids'
import { normalizeSiafemNumber } from '~/schemas/forms/commitment'

export interface IrRetentionReportRow {
  liquidationId: string
  liquidationNumber: string
  irRetentionAmount: number
  commitmentTotalAmount: number
  issueDate: string
  liquidationCreatedAt: string
  commitmentId: string
  commitmentNumber: string
  disbursementProgramNumber: string | null
  disbursementProgramIssuedAt: string | null
  disbursementProgramPaidAt: string | null
  bankOrderNumber: string | null
  bankOrderIssuedAt: string | null
  bankOrderPaidAt: string | null
  supplierId: string | null
  supplierName: string
  supplierCnpj: string
  supplierCnpjFormatted: string
  isSimplesOptant: boolean
  demandId: string | null
  demandName: string
  demandProcessNumber: string | null
  isPaid: boolean
}

export interface IrRetentionReportSummary {
  totalIrRetentionAmount: number
  totalCommitmentAmount: number
  liquidationsCount: number
  commitmentsCount: number
  suppliersCount: number
  paidLiquidationsCount: number
  pendingLiquidationsCount: number
}

export interface IrRetentionFilterParams {
  startDate?: string | null
  endDate?: string | null
  paymentStatus?: 'all' | 'paid' | 'pending'
  supplierId?: string | null
  demandId?: string | null
}

export interface CommitmentExecutionRow {
  commitmentId: string
  commitmentNumber: string
  demandId: string | null
  demandName: string
  demandProcessNumber: string | null
  supplierId: string | null
  supplierName: string
  supplierCnpj: string
  expenseNatureName: string | null
  status: string
  issueDate: string
  disbursementProgramNumber: string | null
  disbursementProgramPaidAt: string | null
  bankOrderNumber: string | null
  committedAmount: number
  liquidatedCount: number
  isPaid: boolean
}

export interface CommitmentExecutionSummary {
  totalCommittedAmount: number
  totalPaidCommitmentsAmount: number
  paidCommitmentsCount: number
  pendingCommitmentsCount: number
  commitmentsCount: number
}

export interface ExecutionFilterParams {
  startDate?: string | null
  endDate?: string | null
  supplierId?: string | null
  demandId?: string | null
}

export const useDemandGeneralReports = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Helper to build commitment totals by SIAFEM commitment number from demand_products.
   */
  const buildTotalsByCommitmentMap = (
    itemsData: Array<{
      commitment_number: string | null
      quantity: number
      demand_product_bids?: Array<{
        id: string
        supplier_id: string
        amount: number
        status: string
        created_at: string
      }> | null
    }>,
  ): Map<string, { count: number; total: number }> => {
    const totals = new Map<string, { count: number; total: number }>()

    for (const item of itemsData || []) {
      const num = item.commitment_number ? normalizeSiafemNumber(item.commitment_number) : null
      if (!num) continue

      const dispute = getItemDisputeResult(item)
      if (dispute.outcome !== 'winner') continue

      const current = totals.get(num) || { count: 0, total: 0 }
      const unitPrice = dispute.winningAmount ?? 0
      const itemTotal = dispute.totalFinal ?? getItemSubtotal(unitPrice, item.quantity)

      current.count += 1
      current.total += itemTotal
      totals.set(num, current)
    }

    return totals
  }

  /**
   * Calculates the summary KPIs for a list of IR retention rows.
   */
  const calculateIrRetentionSummary = (rows: IrRetentionReportRow[]): IrRetentionReportSummary => {
    const uniqueCommitments = new Map<string, number>()
    const uniqueSuppliers = new Set<string>()
    let totalIr = 0
    let paidCount = 0
    let pendingCount = 0

    for (const r of rows) {
      totalIr += r.irRetentionAmount
      if (r.commitmentId) {
        uniqueCommitments.set(r.commitmentId, r.commitmentTotalAmount)
      }
      if (r.supplierId) uniqueSuppliers.add(r.supplierId)
      if (r.isPaid) {
        paidCount++
      } else {
        pendingCount++
      }
    }

    let totalCommitmentsValue = 0
    for (const amount of uniqueCommitments.values()) {
      totalCommitmentsValue += amount
    }

    return {
      totalIrRetentionAmount: totalIr,
      totalCommitmentAmount: totalCommitmentsValue,
      liquidationsCount: rows.length,
      commitmentsCount: uniqueCommitments.size,
      suppliersCount: uniqueSuppliers.size,
      paidLiquidationsCount: paidCount,
      pendingLiquidationsCount: pendingCount,
    }
  }

  /**
   * Fetches the IR retention report data filtered by parameters.
   */
  const fetchIrRetentionReport = async (
    params: IrRetentionFilterParams = {},
  ): Promise<{ rows: IrRetentionReportRow[]; summary: IrRetentionReportSummary }> => {
    const [liquidationsResponse, itemsResponse] = await Promise.all([
      supabase
        .from('demand_commitment_liquidations')
        .select(
          `
          id,
          liquidation_number,
          issue_date,
          observation,
          is_ir_retention,
          ir_retention_amount,
          is_cancellation,
          created_at,
          commitment:demand_commitments!commitment_id (
            id,
            commitment_number,
            status,
            disbursement_program_number,
            disbursement_program_issued_at,
            disbursement_program_paid_at,
            bank_order_number,
            bank_order_issued_at,
            bank_order_paid_at,
            supplier:suppliers!supplier_id (
              id,
              company_name,
              cnpj,
              is_simples_optant
            ),
            demand:demands!demand_id (
              id,
              name,
              process_number,
              bidding_notice_number
            )
          )
        `,
        )
        .eq('is_ir_retention', true)
        .eq('is_cancellation', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('demand_products')
        .select(
          'id, commitment_number, quantity, execution_status, demand_product_bids(id, supplier_id, amount, status, created_at)',
        )
        .not('commitment_number', 'is', null),
    ])

    if (liquidationsResponse.error) {
      console.error('Error fetching IR retention report:', liquidationsResponse.error)
      throw liquidationsResponse.error
    }
    if (itemsResponse.error) {
      console.error('Error fetching items for commitments:', itemsResponse.error)
      throw itemsResponse.error
    }

    const totalsByCommitment = buildTotalsByCommitmentMap(
      (itemsResponse.data || []) as unknown as Array<{
        commitment_number: string | null
        quantity: number
        demand_product_bids?: Array<{
          id: string
          supplier_id: string
          amount: number
          status: string
          created_at: string
        }> | null
      }>,
    )

    const rawRows = (liquidationsResponse.data ?? []) as unknown as Array<{
      id: string
      liquidation_number: string
      issue_date: string
      observation: string | null
      is_ir_retention: boolean
      ir_retention_amount: number | null
      is_cancellation: boolean
      created_at: string
      commitment: {
        id: string
        commitment_number: string
        status: string
        disbursement_program_number: string | null
        disbursement_program_issued_at: string | null
        disbursement_program_paid_at: string | null
        bank_order_number: string | null
        bank_order_issued_at: string | null
        bank_order_paid_at: string | null
        supplier: {
          id: string
          company_name: string
          cnpj: string
          is_simples_optant: boolean | null
        } | null
        demand: {
          id: string
          name: string
          process_number: string | null
          bidding_notice_number: string | null
        } | null
      } | null
    }>

    let rows: IrRetentionReportRow[] = rawRows.map((item) => {
      const commitment = item.commitment
      const supplier = commitment?.supplier
      const demand = commitment?.demand
      const paidDate = commitment?.disbursement_program_paid_at ?? null
      const isPaid = !!paidDate

      const normalizedNE = commitment?.commitment_number
        ? normalizeSiafemNumber(commitment.commitment_number)
        : null
      const commitmentTotal = normalizedNE ? totalsByCommitment.get(normalizedNE)?.total || 0 : 0

      return {
        liquidationId: item.id,
        liquidationNumber: item.liquidation_number,
        irRetentionAmount: Number(item.ir_retention_amount) || 0,
        commitmentTotalAmount: commitmentTotal,
        issueDate: item.issue_date,
        liquidationCreatedAt: item.created_at,
        commitmentId: commitment?.id ?? '',
        commitmentNumber: commitment?.commitment_number ?? '-',
        disbursementProgramNumber: commitment?.disbursement_program_number ?? null,
        disbursementProgramIssuedAt: commitment?.disbursement_program_issued_at ?? null,
        disbursementProgramPaidAt: paidDate,
        bankOrderNumber: commitment?.bank_order_number ?? null,
        bankOrderIssuedAt: commitment?.bank_order_issued_at ?? null,
        bankOrderPaidAt: commitment?.bank_order_paid_at ?? null,
        supplierId: supplier?.id ?? null,
        supplierName: supplier?.company_name ?? 'Fornecedor não informado',
        supplierCnpj: supplier?.cnpj ?? '',
        supplierCnpjFormatted: supplier?.cnpj ? formatCnpj(supplier.cnpj) : '-',
        isSimplesOptant: !!supplier?.is_simples_optant,
        demandId: demand?.id ?? null,
        demandName: demand?.name ?? 'Demanda não vinculada',
        demandProcessNumber: demand?.process_number ?? null,
        isPaid,
      }
    })

    // Filter by payment status if specified
    if (params.paymentStatus === 'paid') {
      rows = rows.filter((r) => r.isPaid)
    } else if (params.paymentStatus === 'pending') {
      rows = rows.filter((r) => !r.isPaid)
    }

    // Filter by supplier if specified
    if (params.supplierId) {
      rows = rows.filter((r) => r.supplierId === params.supplierId)
    }

    // Filter by demand if specified
    if (params.demandId) {
      rows = rows.filter((r) => r.demandId === params.demandId)
    }

    // Filter by date range (considers disbursement_program_paid_at when paid, fallback to liquidationCreatedAt when pending)
    if (params.startDate || params.endDate) {
      rows = rows.filter((r) => {
        const targetDateStr = r.disbursementProgramPaidAt
          ? r.disbursementProgramPaidAt.slice(0, 10)
          : r.liquidationCreatedAt.slice(0, 10)

        if (params.startDate && targetDateStr < params.startDate) return false
        if (params.endDate && targetDateStr > params.endDate) return false
        return true
      })
    }

    // Sort: rows with payment date first (descending), then pending by creation date
    rows.sort((a, b) => {
      const dateA = a.disbursementProgramPaidAt || a.liquidationCreatedAt
      const dateB = b.disbursementProgramPaidAt || b.liquidationCreatedAt
      return dateB.localeCompare(dateA)
    })

    const summary = calculateIrRetentionSummary(rows)
    return { rows, summary }
  }

  /**
   * Exports IR Retention report rows to a CSV file.
   */
  const exportIrRetentionToCsv = (
    rows: IrRetentionReportRow[],
    filenamePrefix = 'relatorio-retencao-ir',
  ): void => {
    const headers = [
      'Status Pagamento PD',
      'Data Pagamento PD',
      'NE (Empenho)',
      'Fornecedor',
      'CNPJ',
      'Optante Simples',
      'NL (Liquidação)',
      'Valor Retenção IR (R$)',
      'Valor Total da NE (R$)',
      'PD (Programa Desembolso)',
      'OB (Ordem Bancária)',
      'Demanda',
      'Processo',
      'Data Cadastro NL',
    ]

    const csvLines = [headers.map(escapeCsvField).join(';')]

    for (const r of rows) {
      const line = [
        r.isPaid ? 'Pago' : 'Pendente',
        r.disbursementProgramPaidAt ? formatDate(r.disbursementProgramPaidAt) : 'Pendente',
        r.commitmentNumber,
        r.supplierName,
        r.supplierCnpjFormatted,
        r.isSimplesOptant ? 'Sim' : 'Não',
        r.liquidationNumber,
        r.irRetentionAmount.toFixed(2).replace('.', ','),
        r.commitmentTotalAmount.toFixed(2).replace('.', ','),
        r.disbursementProgramNumber || '-',
        r.bankOrderNumber || '-',
        r.demandName,
        r.demandProcessNumber || '-',
        formatDate(r.liquidationCreatedAt),
      ]
      csvLines.push(line.map(escapeCsvField).join(';'))
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n')
    const filename = `${toSafeFilename(filenamePrefix, 'relatorio-ir')}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
  }

  /**
   * Generates and downloads an A4 PDF document for the IR Retention report.
   */
  const exportIrRetentionToPdf = async (params: {
    rows: IrRetentionReportRow[]
    summary: IrRetentionReportSummary
    periodLabel?: string
  }): Promise<void> => {
    const doc = await createA4Doc()
    const { rows, summary, periodLabel } = params

    let y = 18

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text('Relatório Geral de Retenção de Imposto de Renda (IR)', PDF_MARGIN_X_MM, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    const subtext = periodLabel
      ? `Período de referência: ${periodLabel} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`
      : `Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`
    doc.text(subtext, PDF_MARGIN_X_MM, y)

    y += 8
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(PDF_MARGIN_X_MM, y, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM, y)

    // Summary Box
    y += 6
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(PDF_MARGIN_X_MM, y, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM * 2, 18, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)

    doc.text('Total IR Retido:', PDF_MARGIN_X_MM + 4, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(185, 28, 28)
    doc.text(formatCurrency(summary.totalIrRetentionAmount), PDF_MARGIN_X_MM + 4, y + 13)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Total Empenhado (NEs):', PDF_MARGIN_X_MM + 55, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(formatCurrency(summary.totalCommitmentAmount), PDF_MARGIN_X_MM + 55, y + 13)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Qtd. NLs Retenção:', PDF_MARGIN_X_MM + 115, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(
      `${summary.liquidationsCount} (${summary.paidLiquidationsCount} pagas)`,
      PDF_MARGIN_X_MM + 115,
      y + 13,
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Fornecedores:', PDF_MARGIN_X_MM + 155, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(String(summary.suppliersCount), PDF_MARGIN_X_MM + 155, y + 13)

    y += 24

    // Table Header
    doc.setFillColor(241, 245, 249)
    doc.rect(PDF_MARGIN_X_MM, y, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM * 2, 7, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(51, 65, 85)

    doc.text('Pgto PD', PDF_MARGIN_X_MM + 2, y + 4.8)
    doc.text('NE', PDF_MARGIN_X_MM + 22, y + 4.8)
    doc.text('Fornecedor', PDF_MARGIN_X_MM + 46, y + 4.8)
    doc.text('NL', PDF_MARGIN_X_MM + 102, y + 4.8)
    doc.text('Retenção IR', PDF_MARGIN_X_MM + 125, y + 4.8)
    doc.text('PD / OB', PDF_MARGIN_X_MM + 155, y + 4.8)

    y += 9

    // Rows
    const pageBottomLimit = 275

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]

      if (y > pageBottomLimit) {
        doc.addPage()
        y = 18

        doc.setFillColor(241, 245, 249)
        doc.rect(PDF_MARGIN_X_MM, y, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM * 2, 7, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(51, 65, 85)
        doc.text('Pgto PD', PDF_MARGIN_X_MM + 2, y + 4.8)
        doc.text('NE', PDF_MARGIN_X_MM + 22, y + 4.8)
        doc.text('Fornecedor', PDF_MARGIN_X_MM + 46, y + 4.8)
        doc.text('NL', PDF_MARGIN_X_MM + 102, y + 4.8)
        doc.text('Retenção IR', PDF_MARGIN_X_MM + 125, y + 4.8)
        doc.text('PD / OB', PDF_MARGIN_X_MM + 155, y + 4.8)
        y += 9
      }

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252)
        doc.rect(PDF_MARGIN_X_MM, y - 4, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM * 2, 8, 'F')
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(30, 41, 59)

      const paidDateLabel = r.disbursementProgramPaidAt
        ? formatDate(r.disbursementProgramPaidAt)
        : 'Pendente'
      doc.text(paidDateLabel, PDF_MARGIN_X_MM + 2, y)
      doc.text(r.commitmentNumber, PDF_MARGIN_X_MM + 22, y)

      const supplierLabel =
        r.supplierName.length > 28 ? r.supplierName.slice(0, 27) + '…' : r.supplierName
      doc.text(supplierLabel, PDF_MARGIN_X_MM + 46, y)

      doc.text(r.liquidationNumber, PDF_MARGIN_X_MM + 102, y)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(185, 28, 28)
      doc.text(formatCurrency(r.irRetentionAmount), PDF_MARGIN_X_MM + 125, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      const pdObLabel = `${r.disbursementProgramNumber || '-'} / ${r.bankOrderNumber || '-'}`
      doc.text(pdObLabel, PDF_MARGIN_X_MM + 155, y)

      y += 8
    }

    appendPageFooters(doc, 'Sistema de Licitações - Retenção de IR', 'Confidencial / Uso Interno')

    const safeName = toSafeFilename('relatorio-retencao-ir', 'relatorio-ir')
    doc.save(`${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  /**
   * Fetches the commitment financial execution summary report.
   */
  const fetchCommitmentExecutionReport = async (
    params: ExecutionFilterParams = {},
  ): Promise<{ rows: CommitmentExecutionRow[]; summary: CommitmentExecutionSummary }> => {
    let query = supabase
      .from('demand_commitments')
      .select(
        `
        id,
        commitment_number,
        status,
        issue_date,
        disbursement_program_number,
        disbursement_program_paid_at,
        bank_order_number,
        suppliers:suppliers!supplier_id (
          id,
          company_name,
          cnpj
        ),
        demands:demands!demand_id (
          id,
          name,
          process_number
        ),
        expense_natures:expense_natures!expense_nature_id (
          name
        ),
        demand_commitment_liquidations (
          id,
          is_cancellation,
          is_ir_retention
        )
      `,
      )
      .order('issue_date', { ascending: false })

    if (params.startDate) {
      query = query.gte('issue_date', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('issue_date', params.endDate)
    }
    if (params.supplierId) {
      query = query.eq('supplier_id', params.supplierId)
    }
    if (params.demandId) {
      query = query.eq('demand_id', params.demandId)
    }

    const [commitmentsResponse, itemsResponse] = await Promise.all([
      query,
      supabase
        .from('demand_products')
        .select(
          'id, commitment_number, quantity, execution_status, demand_product_bids(id, supplier_id, amount, status, created_at)',
        )
        .not('commitment_number', 'is', null),
    ])

    if (commitmentsResponse.error) {
      console.error('Error fetching commitment execution report:', commitmentsResponse.error)
      throw commitmentsResponse.error
    }
    if (itemsResponse.error) {
      console.error('Error fetching commitment items:', itemsResponse.error)
      throw itemsResponse.error
    }

    const totalsByCommitment = buildTotalsByCommitmentMap(
      (itemsResponse.data || []) as unknown as Array<{
        commitment_number: string | null
        quantity: number
        demand_product_bids?: Array<{
          id: string
          supplier_id: string
          amount: number
          status: string
          created_at: string
        }> | null
      }>,
    )

    const rawRows = (commitmentsResponse.data ?? []) as unknown as Array<{
      id: string
      commitment_number: string
      status: string
      issue_date: string
      disbursement_program_number: string | null
      disbursement_program_paid_at: string | null
      bank_order_number: string | null
      suppliers: { id: string; company_name: string; cnpj: string } | null
      demands: { id: string; name: string; process_number: string | null } | null
      expense_natures: { name: string } | null
      demand_commitment_liquidations: Array<{
        id: string
        is_cancellation: boolean
        is_ir_retention: boolean
      }>
    }>

    let totalCommitted = 0
    let totalPaidCommitments = 0
    let paidCount = 0
    let pendingCount = 0

    const rows: CommitmentExecutionRow[] = rawRows.map((c) => {
      const normalizedNE = normalizeSiafemNumber(c.commitment_number)
      const committedAmount = totalsByCommitment.get(normalizedNE)?.total || 0

      const ordinaryLiquidations = (c.demand_commitment_liquidations || []).filter(
        (nl) => !nl.is_cancellation && !nl.is_ir_retention,
      )

      const isPaid = !!c.disbursement_program_paid_at && !!c.bank_order_number

      totalCommitted += committedAmount
      if (isPaid) {
        totalPaidCommitments += committedAmount
        paidCount++
      } else {
        pendingCount++
      }

      return {
        commitmentId: c.id,
        commitmentNumber: c.commitment_number,
        demandId: c.demands?.id ?? null,
        demandName: c.demands?.name ?? 'Não vinculada',
        demandProcessNumber: c.demands?.process_number ?? null,
        supplierId: c.suppliers?.id ?? null,
        supplierName: c.suppliers?.company_name ?? 'Não informado',
        supplierCnpj: c.suppliers?.cnpj ?? '',
        expenseNatureName: c.expense_natures?.name ?? null,
        status: c.status,
        issueDate: c.issue_date,
        disbursementProgramNumber: c.disbursement_program_number,
        disbursementProgramPaidAt: c.disbursement_program_paid_at,
        bankOrderNumber: c.bank_order_number,
        committedAmount,
        liquidatedCount: ordinaryLiquidations.length,
        isPaid,
      }
    })

    const summary: CommitmentExecutionSummary = {
      totalCommittedAmount: totalCommitted,
      totalPaidCommitmentsAmount: totalPaidCommitments,
      paidCommitmentsCount: paidCount,
      pendingCommitmentsCount: pendingCount,
      commitmentsCount: rows.length,
    }

    return { rows, summary }
  }

  /**
   * Exports Execution report rows to a CSV file.
   */
  const exportExecutionToCsv = (
    rows: CommitmentExecutionRow[],
    filenamePrefix = 'relatorio-execucao-financeira',
  ): void => {
    const headers = [
      'NE (Empenho)',
      'Data Emissão',
      'Fornecedor',
      'CNPJ',
      'Demanda',
      'Natureza da Despesa',
      'Valor Empenhado (R$)',
      'Status Pagamento',
      'Qtd. NLs Ordinárias',
      'PD',
      'Data Pgto PD',
      'OB',
    ]

    const csvLines = [headers.map(escapeCsvField).join(';')]

    for (const r of rows) {
      const line = [
        r.commitmentNumber,
        formatDate(r.issueDate),
        r.supplierName,
        r.supplierCnpj ? formatCnpj(r.supplierCnpj) : '-',
        r.demandName,
        r.expenseNatureName || '-',
        r.committedAmount.toFixed(2).replace('.', ','),
        r.isPaid ? 'Pago com OB' : 'Pendente de Pagamento',
        r.liquidatedCount,
        r.disbursementProgramNumber || '-',
        r.disbursementProgramPaidAt ? formatDate(r.disbursementProgramPaidAt) : 'Pendente',
        r.bankOrderNumber || '-',
      ]
      csvLines.push(line.map(escapeCsvField).join(';'))
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n')
    const filename = `${toSafeFilename(filenamePrefix, 'relatorio-execucao')}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
  }

  return {
    calculateIrRetentionSummary,
    fetchIrRetentionReport,
    exportIrRetentionToCsv,
    exportIrRetentionToPdf,
    fetchCommitmentExecutionReport,
    exportExecutionToCsv,
  }
}
