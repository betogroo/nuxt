import type { jsPDF } from 'jspdf'

/** A4 portrait page width in millimetres. */
export const PDF_PAGE_WIDTH_MM = 210
/** Default horizontal page margin in millimetres. */
export const PDF_MARGIN_X_MM = 14

/**
 * Lazily loads jsPDF and creates an A4 portrait document (millimetre units).
 */
export async function createA4Doc(): Promise<jsPDF> {
  const { jsPDF: JsPdfCtor } = await import('jspdf')
  return new JsPdfCtor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
}

/**
 * Draws the standard footer on every page: separator line, left title,
 * centered text and "Página X de Y" on the right.
 */
export function appendPageFooters(doc: jsPDF, leftText: string, centerText: string): void {
  const totalPages = doc.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(PDF_MARGIN_X_MM, 287, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM, 287)
    doc.text(leftText, PDF_MARGIN_X_MM, 291)
    doc.text(centerText, 105, 291, { align: 'center' })
    doc.text(`Página ${i} de ${totalPages}`, PDF_PAGE_WIDTH_MM - PDF_MARGIN_X_MM, 291, {
      align: 'right',
    })
  }
}
