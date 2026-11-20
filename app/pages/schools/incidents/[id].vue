<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { usePermissions } from '~/composables/usePermissions'
  import { useProfile } from '~/composables/useProfile'
  import { useSchoolIncidents } from '~/composables/useSchoolIncidents'
  import { SCHOOL_INCIDENT_STATUS, SCHOOL_INCIDENT_STATUS_MAP } from '~/constants/school-incidents'
  import type { SchoolIncident, SchoolIncidentStatus } from '~/types/school'

  definePageMeta({
    middleware: ['schools'],
    layout: 'default',
    roles: ['admin', 'school-manager', 'school-user'],
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const { profile } = useProfile()
  const { isAdmin, canManageSchools } = usePermissions()
  const {
    fetchIncidentById,
    updateIncidentStatus,
    deleteIncident,
    markIncidentAsRead,
    parseIncidentMentions,
    isLoading,
    isSaving,
  } = useSchoolIncidents()

  const incidentId = computed(() => String(route.params.id || ''))
  const incident = ref<SchoolIncident | null>(null)
  const hasError = ref(false)
  const errorMessage = ref('')

  useHead({
    title: computed(() =>
      incident.value
        ? `${incident.value.title} - Detalhes da Ocorrência`
        : 'Detalhes da Ocorrência - Módulo Escola',
    ),
  })

  const loadIncident = async () => {
    if (!incidentId.value) return
    hasError.value = false
    try {
      const data = await fetchIncidentById(incidentId.value)
      if (!data) {
        hasError.value = true
        errorMessage.value =
          'Ocorrência não encontrada ou você não possui permissão para acessá-la.'
      } else {
        incident.value = data

        // Se o usuário atual for gestor ou admin e a ocorrência ainda não foi lida, marca como lida
        if (canManageSchools() && !data.read_at) {
          try {
            const updated = await markIncidentAsRead(data.id)
            if (updated) {
              incident.value = {
                ...incident.value,
                read_at: updated.read_at,
                read_by: updated.read_by,
                reader:
                  updated.reader ||
                  (profile.value
                    ? {
                        id: profile.value.id,
                        name: profile.value.name,
                        role: profile.value.role,
                      }
                    : incident.value.reader),
              }
            }
          } catch (e) {
            console.warn('Falha silenciosa ao carimbar leitura da ocorrência:', e)
          }
        }
      }
    } catch (err: unknown) {
      hasError.value = true
      errorMessage.value =
        err instanceof Error ? err.message : 'Falha ao carregar os dados da ocorrência.'
    }
  }

  onMounted(() => {
    loadIncident()
  })

  const formattedReadDate = computed(() => {
    if (!incident.value?.read_at) return ''
    const d = new Date(incident.value.read_at)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  })

  const statusConfig = computed(() => {
    if (!incident.value) return SCHOOL_INCIDENT_STATUS_MAP.new
    return SCHOOL_INCIDENT_STATUS_MAP[incident.value.status] || SCHOOL_INCIDENT_STATUS_MAP.new
  })

  const offenders = computed(() => {
    return incident.value?.participants?.filter((p) => p.role === 'offender') || []
  })

  const victims = computed(() => {
    return incident.value?.participants?.filter((p) => p.role === 'victim') || []
  })

  const parsedTokens = computed(() => {
    if (!incident.value?.description) return []
    return parseIncidentMentions(incident.value.description, incident.value.participants || [])
  })

  const formattedDate = computed(() => {
    if (!incident.value?.created_at) return ''
    const d = new Date(incident.value.created_at)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  })

  const canChangeStatus = computed(() => {
    return isAdmin.value || canManageSchools()
  })

  const handleStatusChange = async (newStatus: SchoolIncidentStatus) => {
    if (!incident.value) return
    try {
      await updateIncidentStatus(incident.value.id, newStatus)
      toast.success('Status da ocorrência atualizado!')
      await loadIncident()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar status da ocorrência.'
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    if (!incident.value) return
    const confirmed = window.confirm(
      'Deseja realmente excluir esta ocorrência escolar? Esta ação não pode ser desfeita.',
    )
    if (!confirmed) return

    try {
      await deleteIncident(incident.value.id)
      toast.success('Ocorrência excluída com sucesso!')
      router.push('/schools/incidents')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir a ocorrência.'
      toast.error(msg)
    }
  }
</script>

<template>
  <div class="d-flex flex-column gap-6">
    <!-- Estado de Carregamento -->
    <template v-if="isLoading && !incident">
      <UiCard border class="pa-6" elevation="0" rounded="xl">
        <UiSkeletonLoader type="heading, text, paragraph" />
      </UiCard>
    </template>

    <!-- Estado de Erro / Não Encontrado -->
    <template v-else-if="hasError || (!incident && !isLoading)">
      <UiCard border class="pa-8 text-center" elevation="0" rounded="xl">
        <div class="d-flex flex-column align-center gap-4">
          <UiIcon color="warning" name="alert" size="48" />
          <h2 class="text-h6 font-weight-bold">Acesso à Ocorrência</h2>
          <p class="text-body-2 text-medium-emphasis" style="max-width: 500px">
            {{
              errorMessage ||
              'A ocorrência solicitada não foi encontrada ou não está acessível pelo seu perfil.'
            }}
          </p>
          <UiButton
            color="primary"
            prepend-icon="arrowLeft"
            size="md"
            to="/schools/incidents"
            variant="solid"
          >
            Voltar para Ocorrências
          </UiButton>
        </div>
      </UiCard>
    </template>

    <!-- Conteúdo Principal da Ocorrência -->
    <template v-else-if="incident">
      <!-- Cabeçalho da Página -->
      <UiPageHeader
        :subtitle="`Registrado em ${formattedDate}${incident.author?.name ? ` por ${incident.author.name}` : ''}`"
        :title="incident.title"
      >
        <template #actions>
          <div class="d-flex flex-wrap align-center gap-2">
            <UiButton prepend-icon="arrowLeft" size="sm" to="/schools/incidents" variant="outline">
              Voltar
            </UiButton>

            <UiChip :color="statusConfig.color" size="md" :variant="statusConfig.variant">
              <UiIcon class="mr-1" :name="statusConfig.icon" size="16" />
              {{ statusConfig.label }}
            </UiChip>

            <!-- Chip de Confirmação de Leitura -->
            <UiChip v-if="incident.read_at" color="success" size="md" variant="soft">
              <UiIcon class="mr-1" name="check" size="16" />
              Lida em {{ formattedReadDate
              }}{{ incident.reader?.name ? ` por ${incident.reader.name}` : '' }}
            </UiChip>
            <UiChip v-else color="warning" size="md" variant="outline">
              <UiIcon class="mr-1" name="clockAlert" size="16" />
              Não lida pela gestão
            </UiChip>

            <UiButton
              v-if="isAdmin"
              color="error"
              :disabled="isSaving"
              prepend-icon="delete"
              size="sm"
              variant="ghost"
              @click="handleDelete"
            >
              Excluir
            </UiButton>
          </div>
        </template>
      </UiPageHeader>

      <!-- Seção de Participantes (Ofensores e Vítimas) -->
      <UiRow>
        <!-- Card de Ofensores -->
        <UiCol cols="12" md="6">
          <UiCard border class="pa-4 h-100" elevation="0" rounded="xl">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center gap-2">
                <UiIcon color="warning" name="alert" size="20" />
                <h3 class="text-subtitle-1 font-weight-bold">
                  Ofensores
                  <span class="text-medium-emphasis text-caption">({{ offenders.length }})</span>
                </h3>
              </div>
              <UiChip color="warning" size="xs" variant="soft"> Citação com @ </UiChip>
            </div>

            <div class="d-flex flex-column gap-2">
              <div
                v-for="off in offenders"
                :key="off.id"
                class="pa-3 rounded-lg bg-surface border d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center gap-2">
                  <UiChip color="warning" size="xs" variant="solid">@</UiChip>
                  <span class="font-weight-medium text-body-2">{{ off.name }}</span>
                </div>
                <UiChip v-if="off.classroom" color="neutral" size="xs" variant="outline">
                  {{ off.classroom }}
                </UiChip>
              </div>
            </div>
          </UiCard>
        </UiCol>

        <!-- Card de Vítimas -->
        <UiCol cols="12" md="6">
          <UiCard border class="pa-4 h-100" elevation="0" rounded="xl">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center gap-2">
                <UiIcon color="info" name="shieldUser" size="20" />
                <h3 class="text-subtitle-1 font-weight-bold">
                  Vítimas
                  <span class="text-medium-emphasis text-caption">({{ victims.length }})</span>
                </h3>
              </div>
              <UiChip color="info" size="xs" variant="soft"> Citação com / </UiChip>
            </div>

            <div
              v-if="victims.length === 0"
              class="py-4 text-center text-body-2 text-medium-emphasis"
            >
              Nenhuma vítima identificada para este registro.
            </div>

            <div v-else class="d-flex flex-column gap-2">
              <div
                v-for="vic in victims"
                :key="vic.id"
                class="pa-3 rounded-lg bg-surface border d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center gap-2">
                  <UiChip color="info" size="xs" variant="solid">/</UiChip>
                  <span class="font-weight-medium text-body-2">{{ vic.name }}</span>
                </div>
                <UiChip v-if="vic.classroom" color="neutral" size="xs" variant="outline">
                  {{ vic.classroom }}
                </UiChip>
              </div>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Histórico / Relato do Ocorrido com Destaques -->
      <UiCard border class="pa-5 bg-surface" elevation="0" rounded="xl">
        <div class="d-flex align-center gap-2 mb-3">
          <UiIcon name="history" size="20" />
          <h3 class="text-subtitle-1 font-weight-bold">Histórico e Relato do Fato</h3>
        </div>

        <div
          class="pa-4 rounded-lg bg-surface-variant text-body-1 text-high-emphasis lh-relaxed"
          style="white-space: pre-wrap"
        >
          <template v-for="(token, idx) in parsedTokens" :key="`token-${idx}`">
            <span v-if="token.type === 'text'">{{ token.text }}</span>
            <UiChip
              v-else-if="token.type === 'offender'"
              class="mx-1 font-weight-medium"
              color="warning"
              size="sm"
              variant="solid"
            >
              <UiIcon class="mr-1" name="alert" size="14" />
              {{ token.text }}
              <span v-if="token.classroom" class="ml-1 opacity-80">({{ token.classroom }})</span>
            </UiChip>
            <UiChip
              v-else-if="token.type === 'victim'"
              class="mx-1 font-weight-medium"
              color="info"
              size="sm"
              variant="solid"
            >
              <UiIcon class="mr-1" name="shieldUser" size="14" />
              {{ token.text }}
              <span v-if="token.classroom" class="ml-1 opacity-80">({{ token.classroom }})</span>
            </UiChip>
          </template>
        </div>

        <div class="d-flex align-center gap-2 mt-4 text-caption text-success">
          <UiIcon name="check" size="16" />
          <span>Termo de conformidade e proteção de dados aceito no momento do registro.</span>
        </div>
      </UiCard>

      <!-- Painel de Gerenciamento de Status (Gestores e Administradores) -->
      <UiCard v-if="canChangeStatus" border class="pa-5 bg-surface" elevation="0" rounded="xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div>
            <h3 class="text-subtitle-1 font-weight-bold">Controle e Gestão do Status</h3>
            <p class="text-body-2 text-medium-emphasis">
              Avance ou altere o status desta ocorrência conforme a condução escolar.
            </p>
          </div>
          <UiChip :color="statusConfig.color" size="sm" :variant="statusConfig.variant">
            Atual: {{ statusConfig.label }}
          </UiChip>
        </div>

        <div class="d-flex flex-wrap align-center gap-2 pt-2 border-t">
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.NEW"
            :disabled="isSaving"
            size="sm"
            variant="outline"
            @click="handleStatusChange('new')"
          >
            Marcar como Nova
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.UNDER_REVIEW"
            color="warning"
            :disabled="isSaving"
            size="sm"
            variant="outline"
            @click="handleStatusChange('under_review')"
          >
            Em Análise
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.IN_PROGRESS"
            color="primary"
            :disabled="isSaving"
            size="sm"
            variant="outline"
            @click="handleStatusChange('in_progress')"
          >
            Em Andamento
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.RESOLVED"
            color="success"
            :disabled="isSaving"
            size="sm"
            variant="solid"
            @click="handleStatusChange('resolved')"
          >
            Resolver Ocorrência
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.ARCHIVED"
            :disabled="isSaving"
            size="sm"
            variant="ghost"
            @click="handleStatusChange('archived')"
          >
            Arquivar
          </UiButton>
        </div>
      </UiCard>
    </template>
  </div>
</template>
