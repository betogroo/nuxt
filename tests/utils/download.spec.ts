import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadBlob, downloadFile, downloadJson } from '../../app/utils/download'

describe('utils/download', () => {
  let createdUrl = ''
  const mockCreateObjectURL = vi.fn((_blob: Blob) => {
    createdUrl = 'blob:http://localhost/mock-uuid'
    return createdUrl
  })
  const mockRevokeObjectURL = vi.fn()

  beforeEach(() => {
    createdUrl = ''
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('triggers download for a Blob and cleans up elements and object URLs', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    const blob = new Blob(['hello world'], { type: 'text/plain' })
    downloadBlob(blob, 'sample.txt')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
    expect(appendSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(createdUrl)
  })

  it('triggers download for string content using downloadFile', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadFile('col1;col2\nval1;val2', 'test.csv', 'text/csv')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })

  it('triggers download for JSON data using downloadJson', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadJson({ foo: 'bar', num: 42 }, 'data.json')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})
