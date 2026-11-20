import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useAuthSession } from './useAuthSession'
import { useLogger } from './useLogger'
import type {
  SchoolIncident,
  SchoolIncidentParticipant,
  SchoolIncidentStatus,
  CreateSchoolIncidentPayload,
} from '~/types/school'

export interface ParsedIncidentMentionToken {
  type: 'text' | 'offender' | 'victim'
  text: string
  label?: string
  classroom?: string | null
}

export const useSchoolIncidents = () => {
  const supabase = useSupabaseClient()
  const { ensureUser } = useAuthSession()
  const { logAction } = useLogger()

  const incidents = ref<SchoolIncident[]>([])
  const isLoading = ref<boolean>(false)
  const isSaving = ref<boolean>(false)
  const error = ref<string | null>(null)

  /**
   * Busca todas as ocorrências acessíveis pelo usuário atual
   * (conforme RLS: school-user vê apenas as suas; school-manager e admin vêem todas).
   */
  const fetchIncidents = async (): Promise<SchoolIncident[]> => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('school_incidents')
        .select(
          `
          id,
          title,
          description,
          status,
          terms_accepted,
          created_by,
          created_at,
          updated_at,
          participants:school_incident_participants(
            id,
            incident_id,
            role,
            name,
            classroom,
            created_at,
            updated_at
          ),
          author:profiles!created_by(
            id,
            name,
            role
          )
        `,
        )
        .order('created_at', { ascending: false })

      if (err) throw err

      const typedData = (data as unknown as SchoolIncident[]) || []
      incidents.value = typedData
      return typedData
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao carregar as ocorrências escolares.'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Busca uma ocorrência específica pelo seu ID com participantes e autor.
   */
  const fetchIncidentById = async (id: string): Promise<SchoolIncident | null> => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('school_incidents')
        .select(
          `
          id,
          title,
          description,
          status,
          terms_accepted,
          created_by,
          created_at,
          updated_at,
          participants:school_incident_participants(
            id,
            incident_id,
            role,
            name,
            classroom,
            created_at,
            updated_at
          ),
          author:profiles!created_by(
            id,
            name,
            role
          )
        `,
        )
        .eq('id', id)
        .single()

      if (err) throw err
      return (data as unknown as SchoolIncident) || null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar detalhes da ocorrência.'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Registra uma nova ocorrência escolar com seus ofensores e vítimas.
   */
  const createIncident = async (payload: CreateSchoolIncidentPayload): Promise<SchoolIncident> => {
    isSaving.value = true
    error.value = null
    try {
      const user = await ensureUser()
      if (!user) throw new Error('Usuário não autenticado.')

      if (!payload.title || !payload.title.trim()) {
        throw new Error('O título da ocorrência é obrigatório.')
      }

      if (!payload.description || !payload.description.trim()) {
        throw new Error('O histórico/relato da ocorrência é obrigatório.')
      }

      if (!payload.terms_accepted) {
        throw new Error(
          'É obrigatório declarar a ciência dos termos e a não inserção de nomes de alunos no relato.',
        )
      }

      const validOffenders =
        payload.offenders?.filter((o) => o && o.name && o.name.trim() !== '') || []
      if (validOffenders.length === 0) {
        throw new Error('É obrigatório cadastrar pelo menos um ofensor para a ocorrência.')
      }

      const validVictims = payload.victims?.filter((v) => v && v.name && v.name.trim() !== '') || []

      // 1. Inserir a ocorrência principal
      const { data: incidentData, error: incidentErr } = await supabase
        .from('school_incidents')
        .insert({
          title: payload.title.trim(),
          description: payload.description.trim(),
          status: 'new',
          terms_accepted: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (incidentErr) throw incidentErr
      const createdIncident = incidentData as unknown as SchoolIncident

      // 2. Montar participantes (ofensores e vítimas)
      const participantsToInsert = [
        ...validOffenders.map((o) => ({
          incident_id: createdIncident.id,
          role: 'offender' as const,
          name: o.name.trim(),
          classroom: o.classroom?.trim() || null,
        })),
        ...validVictims.map((v) => ({
          incident_id: createdIncident.id,
          role: 'victim' as const,
          name: v.name.trim(),
          classroom: v.classroom?.trim() || null,
        })),
      ]

      const { error: partErr } = await supabase
        .from('school_incident_participants')
        .insert(participantsToInsert)

      if (partErr) {
        // Tenta remover ocorrência orfã se a inserção de participantes falhar
        await supabase.from('school_incidents').delete().eq('id', createdIncident.id)
        throw partErr
      }

      await logAction(
        'CREATE_SCHOOL_INCIDENT',
        `Created school incident "${payload.title.trim()}" with ${validOffenders.length} offender(s) and ${validVictims.length} victim(s)`,
      )

      await fetchIncidents()
      return createdIncident
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao registrar a ocorrência escolar.'
      error.value = message
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Atualiza o status de uma ocorrência escolar (Gestores e Administradores).
   */
  const updateIncidentStatus = async (id: string, status: SchoolIncidentStatus): Promise<void> => {
    isSaving.value = true
    error.value = null
    try {
      const { error: err } = await supabase.from('school_incidents').update({ status }).eq('id', id)

      if (err) throw err

      await logAction(
        'UPDATE_SCHOOL_INCIDENT_STATUS',
        `Updated status of school incident ${id} to ${status}`,
      )

      await fetchIncidents()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao atualizar o status da ocorrência.'
      error.value = message
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Exclui uma ocorrência escolar (Exclusivo para Administrador).
   */
  const deleteIncident = async (id: string): Promise<void> => {
    isSaving.value = true
    error.value = null
    try {
      const { error: err } = await supabase.from('school_incidents').delete().eq('id', id)
      if (err) throw err

      await logAction('DELETE_SCHOOL_INCIDENT', `Deleted school incident ${id}`)
      await fetchIncidents()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir a ocorrência.'
      error.value = message
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Utilitário para quebrar o texto do relato em tokens com formatação de marcações
   * '@' (ofensor) e '/' (vítima).
   */
  const parseIncidentMentions = (
    text: string,
    participants: SchoolIncidentParticipant[] = [],
  ): ParsedIncidentMentionToken[] => {
    if (!text) return []

    const offenders = participants.filter((p) => p.role === 'offender')
    const victims = participants.filter((p) => p.role === 'victim')

    // Escape regex helper
    const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

    // Constrói alternativas priorizando nomes completos cadastrados (mais longos primeiro)
    const knownPatterns: string[] = []
    for (const off of offenders) {
      if (off.name && off.name.trim()) {
        knownPatterns.push(`@${escapeRegex(off.name.trim())}`)
      }
    }
    for (const vic of victims) {
      if (vic.name && vic.name.trim()) {
        knownPatterns.push(`/${escapeRegex(vic.name.trim())}`)
      }
    }

    // Ordena do mais longo para o mais curto para evitar match parcial
    knownPatterns.sort((a, b) => b.length - a.length)

    // Padrão genérico de fallback para menções de palavra única (@nome ou /nome)
    const genericPattern = '[@/][a-zA-Z0-9À-ÿ_\\-]+'

    const combinedRegexString =
      knownPatterns.length > 0
        ? `(${knownPatterns.join('|')}|${genericPattern})`
        : `(${genericPattern})`

    const regex = new RegExp(combinedRegexString, 'g')
    const tokens: ParsedIncidentMentionToken[] = []
    let lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          text: text.slice(lastIndex, match.index),
        })
      }

      const raw = match[0]
      const prefix = raw[0]
      const namePart = raw.slice(1).trim().toLowerCase()

      if (prefix === '@') {
        const matched = offenders.find(
          (o) =>
            o.name.trim().toLowerCase() === namePart ||
            namePart.includes(o.name.trim().toLowerCase()) ||
            o.name.trim().toLowerCase().includes(namePart),
        )
        tokens.push({
          type: 'offender',
          text: raw,
          label: matched ? matched.name : raw,
          classroom: matched?.classroom,
        })
      } else if (prefix === '/') {
        const matched = victims.find(
          (v) =>
            v.name.trim().toLowerCase() === namePart ||
            namePart.includes(v.name.trim().toLowerCase()) ||
            v.name.trim().toLowerCase().includes(namePart),
        )
        tokens.push({
          type: 'victim',
          text: raw,
          label: matched ? matched.name : raw,
          classroom: matched?.classroom,
        })
      }

      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      tokens.push({
        type: 'text',
        text: text.slice(lastIndex),
      })
    }

    return tokens
  }

  return {
    incidents,
    isLoading,
    isSaving,
    error,
    fetchIncidents,
    fetchIncidentById,
    createIncident,
    updateIncidentStatus,
    deleteIncident,
    parseIncidentMentions,
  }
}
