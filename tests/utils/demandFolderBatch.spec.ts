import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sanitizeFolderName,
  buildDemandRootFolderName,
  buildDemandFolderBatchScript,
  downloadDemandFolderBatch,
} from '~/utils/demandFolderBatch'
import * as downloadModule from '~/utils/download'

vi.mock('~/utils/download', () => ({
  downloadFile: vi.fn(),
  downloadBlob: vi.fn(),
  downloadJson: vi.fn(),
}))

describe('demandFolderBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeFolderName', () => {
    it('preserves valid letters, numbers, spaces, hyphens and accented characters', () => {
      const input = '2026-01 - Artigos de Escritório e Papelaria'
      expect(sanitizeFolderName(input)).toBe('2026-01 - Artigos de Escritório e Papelaria')
    })

    it('replaces slashes and colons with hyphens', () => {
      const input = 'Processo: 2026/01 / Demanda'
      expect(sanitizeFolderName(input)).toBe('Processo - 2026-01 - Demanda')
    })

    it('strips illegal Windows characters (* ? " < > |)', () => {
      const input = 'Demanda *urgente* ? "teste" <2026> | OK'
      expect(sanitizeFolderName(input)).toBe('Demanda urgente teste 2026 OK')
    })

    it('removes trailing spaces and dots prohibited by Windows NTFS', () => {
      const input = '   Pasta da Demanda...   '
      expect(sanitizeFolderName(input)).toBe('Pasta da Demanda')
    })

    it('handles empty or whitespace strings', () => {
      expect(sanitizeFolderName('')).toBe('')
      expect(sanitizeFolderName('   ')).toBe('')
    })
  })

  describe('buildDemandRootFolderName', () => {
    it('formats with both internal_process_number and name', () => {
      const demand = {
        internal_process_number: '2026-01',
        name: 'Artigos de Escritório e Papelaria',
      }
      expect(buildDemandRootFolderName(demand)).toBe('2026-01 - Artigos de Escritório e Papelaria')
    })

    it('formats with only name when internal_process_number is missing', () => {
      const demand = {
        internal_process_number: null,
        name: 'Aquisição de Monitores',
      }
      expect(buildDemandRootFolderName(demand)).toBe('Aquisição de Monitores')
    })

    it('falls back to "Demanda" when both are empty', () => {
      expect(buildDemandRootFolderName({})).toBe('Demanda')
      expect(buildDemandRootFolderName({ internal_process_number: '', name: '' })).toBe('Demanda')
    })
  })

  describe('buildDemandFolderBatchScript', () => {
    it('generates a valid Windows batch script with chcp 65001 and mkdir for default subfolders', () => {
      const script = buildDemandFolderBatchScript({
        rootFolderName: '2026-01 - Artigos de Escritório',
        subfolders: ['itens', 'sei', 'siafem'],
      })

      expect(script).toContain('@echo off')
      expect(script).toContain('chcp 65001 > nul')
      expect(script).toContain('set "ROOT_DIR=2026-01 - Artigos de Escritório"')
      expect(script).toContain('if not exist "%ROOT_DIR%" mkdir "%ROOT_DIR%"')
      expect(script).toContain('if not exist "%ROOT_DIR%\\itens" mkdir "%ROOT_DIR%\\itens"')
      expect(script).toContain('if not exist "%ROOT_DIR%\\sei" mkdir "%ROOT_DIR%\\sei"')
      expect(script).toContain('if not exist "%ROOT_DIR%\\siafem" mkdir "%ROOT_DIR%\\siafem"')
      expect(script).toContain('pause')
    })

    it('supports custom subfolder list', () => {
      const script = buildDemandFolderBatchScript({
        rootFolderName: 'Demanda 2026',
        subfolders: ['documentos', 'cotacoes', 'atas'],
      })

      expect(script).toContain(
        'if not exist "%ROOT_DIR%\\documentos" mkdir "%ROOT_DIR%\\documentos"',
      )
      expect(script).toContain('if not exist "%ROOT_DIR%\\cotacoes" mkdir "%ROOT_DIR%\\cotacoes"')
      expect(script).toContain('if not exist "%ROOT_DIR%\\atas" mkdir "%ROOT_DIR%\\atas"')
    })
  })

  describe('downloadDemandFolderBatch', () => {
    it('triggers downloadFile with .bat filename and text/plain mimeType', () => {
      const demand = {
        internal_process_number: '2026-01',
        name: 'Artigos de Escritório',
      }
      downloadDemandFolderBatch({
        demand,
        subfolders: ['itens', 'sei', 'siafem'],
      })

      expect(downloadModule.downloadFile).toHaveBeenCalledWith(
        expect.stringContaining('set "ROOT_DIR=2026-01 - Artigos de Escritório"'),
        expect.stringMatching(/^criar-pastas-.*\.bat$/),
        'application/x-bat;charset=utf-8',
      )
    })
  })
})
