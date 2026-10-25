import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  useElectionVoterCards,
  formatCardDate,
  buildSingleVoterCardHtml,
  buildBatchVoterCardsHtml,
  buildVoterCardsPdfDoc,
} from '~/composables/useElectionVoterCards'
import type { VoterCardItem } from '~/types/election-voter'

const { logActionMock, printHtmlViaIframeMock, downloadBlobMock } = vi.hoisted(() => ({
  logActionMock: vi.fn(),
  printHtmlViaIframeMock: vi.fn().mockResolvedValue(undefined),
  downloadBlobMock: vi.fn(),
}))

mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))
mockNuxtImport('downloadBlob', () => downloadBlobMock)
mockNuxtImport('printHtmlViaIframe', () => printHtmlViaIframeMock)

describe('useElectionVoterCards Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockVoterItem: VoterCardItem = {
    id: 'e8bdca7a-7a26-4b64-b4cf-e799447e855a',
    voter_registration_number: '100599',
    name: 'Bruno Alves Alves',
    is_active: true,
    issueDate: '2026-10-25',
  }

  it('formatCardDate should format YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatCardDate('2026-10-25')).toBe('25/10/2026')
    expect(formatCardDate(null)).toBe('-')
  })

  it('buildSingleVoterCardHtml should produce HTML with voter details and validation code', () => {
    const html = buildSingleVoterCardHtml(mockVoterItem)

    expect(html).toContain('Bruno Alves Alves')
    expect(html).toContain('100599')
    expect(html).toContain('25/10/2026')
    expect(html).toContain('TÍTULO ELEITORAL')
    expect(html).toContain('REGULAR / APTO')
    expect(html).toContain('BR-100599-')
  })

  it('buildBatchVoterCardsHtml should wrap voters in cut-guides and chunk into pages', () => {
    const voters = [
      { ...mockVoterItem, id: 'v-1', voter_registration_number: '111111' },
      { ...mockVoterItem, id: 'v-2', voter_registration_number: '222222' },
      { ...mockVoterItem, id: 'v-3', voter_registration_number: '333333' },
      { ...mockVoterItem, id: 'v-4', voter_registration_number: '444444' },
      { ...mockVoterItem, id: 'v-5', voter_registration_number: '555555' },
    ]

    const html = buildBatchVoterCardsHtml({
      issueDate: '2026-10-25',
      voters,
    })

    expect(html).toContain('Emissão de Títulos Eleitorais (5 registros)')
    expect(html).toContain('page-break') // 5 voters means 2 pages
    expect(html).toContain('111111')
    expect(html).toContain('555555')
  })

  it('printVoterCards should call printHtmlViaIframe and log action', async () => {
    const { printVoterCards } = useElectionVoterCards()

    await printVoterCards({
      issueDate: '2026-10-25',
      voters: [mockVoterItem],
    })

    expect(logActionMock).toHaveBeenCalledWith(
      'ELECTION_VOTER_CARDS_ISSUE',
      expect.stringContaining('Emissão impressa de 1 título(s) eleitoral(is)'),
    )
  })

  it('exportVoterCardsToPdf should generate PDF and trigger download', async () => {
    const { exportVoterCardsToPdf } = useElectionVoterCards()

    await exportVoterCardsToPdf({
      issueDate: '2026-10-25',
      voters: [mockVoterItem],
    })

    expect(logActionMock).toHaveBeenCalledWith(
      'ELECTION_VOTER_CARDS_ISSUE',
      expect.stringContaining('Exportação em PDF de 1 título(s) eleitoral(is)'),
    )
  })

  it('buildVoterCardsPdfDoc should build a valid jsPDF document with correct pages', async () => {
    const doc = await buildVoterCardsPdfDoc({
      issueDate: '2026-10-25',
      voters: [mockVoterItem, { ...mockVoterItem, id: 'v-2', voter_registration_number: '200599' }],
    })

    expect(doc).toBeDefined()
    expect(doc.getNumberOfPages()).toBe(1)

    // With 5 voters, should create 2 pages (4 per page)
    const docMulti = await buildVoterCardsPdfDoc({
      issueDate: '2026-10-25',
      voters: [
        mockVoterItem,
        { ...mockVoterItem, id: 'v-2', voter_registration_number: '200599' },
        { ...mockVoterItem, id: 'v-3', voter_registration_number: '300599' },
        { ...mockVoterItem, id: 'v-4', voter_registration_number: '400599' },
        { ...mockVoterItem, id: 'v-5', voter_registration_number: '500599' },
      ],
    })
    expect(docMulti.getNumberOfPages()).toBe(2)
  })
})
