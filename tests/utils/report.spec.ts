import { describe, it, expect, vi, afterEach } from 'vitest'
import { escapeCsvField } from '~/utils/reportCsv'
import { escapeHtml, printHtmlViaIframe } from '~/utils/reportHtml'
import { toSafeFilename } from '~/utils/reportFilename'
import {
  PDF_MARGIN_X_MM,
  PDF_PAGE_WIDTH_MM,
  appendPageFooters,
  createA4Doc,
} from '~/utils/reportPdf'

describe('utils/reportCsv', () => {
  it('escapes quotes and handles nullish values', () => {
    expect(escapeCsvField('a"b')).toBe('"a""b"')
    expect(escapeCsvField(12)).toBe('"12"')
    expect(escapeCsvField(null)).toBe('""')
    expect(escapeCsvField(undefined)).toBe('""')
  })
})

describe('utils/reportHtml', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('escapeHtml escapes special chars and handles nullish values', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#039;&amp;&#039;&lt;/a&gt;',
    )
    expect(escapeHtml(5)).toBe('5')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml('')).toBe('')
  })

  it('printHtmlViaIframe appends and removes the hidden iframe, then resolves', async () => {
    vi.useFakeTimers()
    const promise = printHtmlViaIframe('<html><body>x</body></html>')
    expect(document.querySelectorAll('iframe').length).toBe(1)
    await vi.advanceTimersByTimeAsync(1000)
    await promise
    expect(document.querySelectorAll('iframe').length).toBe(0)
  })
})

describe('utils/reportFilename', () => {
  it('slugifies names and uses fallback when empty', () => {
    expect(toSafeFilename('Eleição 2026 / Grêmio', 'x')).toBe('elei__o_2026___gr_mio')
    expect(toSafeFilename('Ab-C_d', 'x')).toBe('ab-c_d')
    expect(toSafeFilename('', 'demanda')).toBe('demanda')
    expect(toSafeFilename(null, 'eleicao')).toBe('eleicao')
  })
})

describe('utils/reportPdf', () => {
  it('exposes A4 layout constants', () => {
    expect(PDF_PAGE_WIDTH_MM).toBe(210)
    expect(PDF_MARGIN_X_MM).toBe(14)
  })

  it('createA4Doc returns a portrait A4 document', async () => {
    const doc = await createA4Doc()
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 0)
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 0)
  })

  it('appendPageFooters writes footer texts on every page', async () => {
    const doc = await createA4Doc()
    doc.addPage()
    const textSpy = vi.spyOn(doc, 'text')
    appendPageFooters(doc, 'Left', 'Center')
    const written = textSpy.mock.calls.map((c) => c[0])
    expect(written).toEqual(
      expect.arrayContaining(['Left', 'Center', 'Página 1 de 2', 'Página 2 de 2']),
    )
    expect(textSpy).toHaveBeenCalledTimes(6)
  })
})
