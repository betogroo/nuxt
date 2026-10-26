import { formatCurrency } from './formatters'
import type { SupplierCommitmentGroup } from '~/composables/useDemandDetail'

export interface DemandForConvocationEmail {
  contract_number?: string | number | null
  bidding_notice_number?: string | null
  dispute_date?: string | null
  created_at?: string | null
  name?: string | null
}

export interface SupplierForConvocationEmail {
  company_name: string
  email?: string | null
  cnpj?: string | null
  commitments: SupplierCommitmentGroup[]
}

export interface ConvocationEmailData {
  contractNumberWithYear: string
  subject: string
  body: string
  fullText: string
  mailtoLink: string
  recipientEmail: string | null
}

/**
 * Resolves the procurement number and year.
 * Per project requirement, ALWAYS prioritize `contract_number`.
 * If it has a slash (e.g., '90001/2026'), use as-is.
 * If not, append the year inferred from dispute_date, created_at, or the current year.
 */
export function resolveProcurementNumberWithYear(
  demand?: DemandForConvocationEmail | null,
): string {
  if (!demand) {
    return `[Nº CONTRATAÇÃO/${new Date().getFullYear()}]`
  }

  // 1. Primary: contract_number
  const rawContract =
    demand.contract_number !== null && demand.contract_number !== undefined
      ? String(demand.contract_number).trim()
      : ''

  // 2. Fallback: bidding_notice_number if contract_number is missing
  const targetNumber = rawContract || (demand.bidding_notice_number?.trim() ?? '')

  if (!targetNumber) {
    return `[Nº CONTRATAÇÃO/${new Date().getFullYear()}]`
  }

  if (targetNumber.includes('/')) {
    return targetNumber
  }

  // Determine year
  let year = ''
  if (demand.dispute_date) {
    const match = demand.dispute_date.match(/^(\d{4})/)
    if (match) year = match[1]
  }
  if (!year && demand.created_at) {
    const match = demand.created_at.match(/^(\d{4})/)
    if (match) year = match[1]
  }
  if (!year) {
    year = String(new Date().getFullYear())
  }

  return `${targetNumber}/${year}`
}

/**
 * Formats the list of commitment notes for inclusion in the summons email.
 */
export function formatCommitmentsList(commitments: SupplierCommitmentGroup[]): string {
  if (!commitments || commitments.length === 0) {
    return '• Nenhuma nota de empenho cadastrada até o momento.'
  }

  return commitments
    .map((c) => {
      const itemsDetail =
        c.itemNames && c.itemNames.length > 0
          ? ` (${c.itemsCount} ${c.itemsCount === 1 ? 'item' : 'itens'}: ${c.itemNames.join(', ')})`
          : ` (${c.itemsCount} ${c.itemsCount === 1 ? 'item' : 'itens'})`

      return `• Nota de Empenho nº ${c.commitmentNumber} - Valor Total: ${formatCurrency(c.totalAmount)}${itemsDetail}`
    })
    .join('\n')
}

/**
 * Generates the complete convocation email data for a winning supplier.
 */
export function generateConvocationEmail(
  demand?: DemandForConvocationEmail | null,
  supplier?: SupplierForConvocationEmail | null,
): ConvocationEmailData {
  const contractNumberWithYear = resolveProcurementNumberWithYear(demand)
  const companyName = supplier?.company_name?.trim() || '[NOME DA EMPRESA]'
  const recipientEmail = supplier?.email?.trim() || null
  const commitmentsList = formatCommitmentsList(supplier?.commitments || [])

  const subject = `CONVOCAÇÃO: Envio de Nota de Empenho - Dispensa Eletrônica nº ${contractNumberWithYear}`

  const body = `Prezado(a) responsável pela ${companyName}

Parabenizamos a empresa por sagrar-se vencedora na Dispensa de Licitação Eletrônica nº ${contractNumberWithYear} promovida pela Delegacia Seccional de Polícia de São Joaquim da Barra (UGE 180297)

Em conformidade com as regras estabelecidas no Item 10.6 do nosso Aviso de Contratação Direta, estamos encaminhando, em anexo a este e-mail, a(s) respectiva(s) Nota(s) de Empenho eletrônica(s):

${commitmentsList}

INFORMAÇÕES IMPORTANTES E PRAZOS:

Prazo Legal: Vossa Senhoria dispõe do prazo improrrogável de 5 (cinco) dias úteis, contados a partir da data de envio deste e-mail, para encaminhar a confirmação formal de recebimento deste documento.

Como Confirmar: A confirmação deverá ser feita simplesmente respondendo a este e-mail, confirmando o recebimento do email e a integridade dos anexos.

Penalidades: Relembramos que, conforme previsto no edital e na Lei nº 14.133/2021, o não envio da confirmação dentro do prazo estipulado caracterizará a recusa injustificada à contratação, sujeitando a empresa à decadência do direito e à abertura de processo administrativo para aplicação das sanções de multa e impedimento de licitar.

Lembramos que, nos termos do edital, é de exclusiva responsabilidade do fornecedor o monitoramento de seus canais eletrônicos de comunicação.

Agradecemos desde já pela parceria e colaboração. Caso haja qualquer dúvida quanto aos quantitativos ou procedimentos de entrega (conforme cronograma do Termo de Referência), nossa equipe está à total disposição para orientá-lo.

Delegacia Seccional de Polícia de São Joaquim da Barra 
CNPJ: 04.236.548/0074-41
Endereço: Rua Marechal Deodoro, 230 - Centro - CEP 14600-059 - São Joaquim da Barra/SP
Telefone: (16) 3818-1099 | Ramais 303 ou 305

Atenciosamente,`

  const fullText = `Assunto: ${subject}\n\n${body}`

  const mailtoRecipient = recipientEmail ? encodeURIComponent(recipientEmail) : ''
  const mailtoSubject = encodeURIComponent(subject)
  const mailtoBody = encodeURIComponent(body)
  const mailtoLink = `mailto:${mailtoRecipient}?subject=${mailtoSubject}&body=${mailtoBody}`

  return {
    contractNumberWithYear,
    subject,
    body,
    fullText,
    mailtoLink,
    recipientEmail,
  }
}
