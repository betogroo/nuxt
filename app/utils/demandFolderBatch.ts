import { DEFAULT_DEMAND_BATCH_SUBFOLDERS } from '~/schemas/forms/system-settings'
import { downloadFile } from '~/utils/download'
import { toSafeFilename } from '~/utils/reportFilename'

/**
 * Sanitiza um nome de pasta para ser compatível com o sistema de arquivos do Windows (NTFS),
 * removendo ou substituindo caracteres proibidos: \ / : * ? " < > |
 * e evitando que termine com pontos ou espaços.
 */
export function sanitizeFolderName(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''

  return (
    raw
      // Substitui dois pontos e barras cercadas por espaços por " - "
      .replace(/\s*:\s*/g, ' - ')
      .replace(/\s+[/\\]\s+/g, ' - ')
      // Substitui barras restantes (ex: 2026/01) por hífen simples sem espaço
      .replace(/[/\\]/g, '-')
      // Remove caracteres ilegais no Windows: * ? " < > |
      .replace(/[*?"<>|]/g, '')
      // Substitui múltiplos espaços por um único
      .replace(/\s+/g, ' ')
      // Remove hífens múltiplos consecutivos
      .replace(/-{2,}/g, '-')
      // Remove pontos ou espaços no início e no final (restrição do Windows)
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .trim()
  )
}

/**
 * Constrói o nome da pasta principal da demanda no padrão:
 * "{numero do processo interno} - {nome da demanda}"
 * Exemplo: "2026-01 - Artigos de Escritório e Papelaria"
 */
export function buildDemandRootFolderName(demand: {
  internal_process_number?: string | null
  name?: string | null
}): string {
  const processNum = demand.internal_process_number?.trim()
  const demandName = demand.name?.trim() || 'Demanda'

  const combined = processNum ? `${processNum} - ${demandName}` : demandName
  return sanitizeFolderName(combined) || 'Demanda'
}

/**
 * Gera o conteúdo executável de um arquivo Windows Batch (.bat)
 * que cria a pasta principal e suas respectivas subpastas com suporte a UTF-8.
 */
export function buildDemandFolderBatchScript(params: {
  rootFolderName: string
  subfolders: readonly string[] | string[]
}): string {
  const rootDir = sanitizeFolderName(params.rootFolderName) || 'Demanda'
  const subfoldersList = (
    params.subfolders && params.subfolders.length > 0
      ? params.subfolders
      : DEFAULT_DEMAND_BATCH_SUBFOLDERS
  )
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const mkdirLines = subfoldersList
    .map((sub) => {
      // Suporta subpastas com barras ou subníveis (ex: "sei/anexos")
      const normalizedSub = sub.replace(/\//g, '\\')
      return `if not exist "%ROOT_DIR%\\${normalizedSub}" mkdir "%ROOT_DIR%\\${normalizedSub}"`
    })
    .join('\r\n')

  return [
    '@echo off',
    'chcp 65001 > nul',
    'setlocal enabledelayedexpansion',
    '',
    'echo ========================================================',
    'echo   Criador de Estrutura de Pastas da Demanda',
    'echo ========================================================',
    'echo.',
    '',
    `set "ROOT_DIR=${rootDir}"`,
    '',
    'echo Criando pasta principal: "%ROOT_DIR%"',
    'if not exist "%ROOT_DIR%" mkdir "%ROOT_DIR%"',
    '',
    'echo Criando subpastas...',
    mkdirLines,
    '',
    'echo.',
    'echo ========================================================',
    'echo   Estrutura de pastas criada com sucesso!',
    'echo   Local: "%ROOT_DIR%"',
    'echo ========================================================',
    'echo.',
    'pause',
    '',
  ].join('\r\n')
}

/**
 * Dispara o download imediato do arquivo .bat no navegador.
 */
export function downloadDemandFolderBatch(params: {
  demand: {
    internal_process_number?: string | null
    name?: string | null
  }
  subfolders?: readonly string[] | string[]
}): void {
  const rootFolderName = buildDemandRootFolderName(params.demand)
  const scriptContent = buildDemandFolderBatchScript({
    rootFolderName,
    subfolders: params.subfolders || DEFAULT_DEMAND_BATCH_SUBFOLDERS,
  })

  const safeName = toSafeFilename(rootFolderName, 'demanda')
  const filename = `criar-pastas-${safeName}.bat`

  downloadFile(scriptContent, filename, 'application/x-bat;charset=utf-8')
}
