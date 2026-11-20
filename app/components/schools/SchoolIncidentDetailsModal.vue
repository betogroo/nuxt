<script setup lang="ts">
  import { computed } from 'vue'
  import { usePermissions } from '~/composables/usePermissions'
  import { useSchoolIncidents } from '~/composables/useSchoolIncidents'
  import { SCHOOL_INCIDENT_STATUS, SCHOOL_INCIDENT_STATUS_MAP } from '~/constants/school-incidents'
  import type { SchoolIncident, SchoolIncidentStatus } from '~/types/school'

  const props = defineProps<{
    incident: SchoolIncident | null
  }>()

  const emit = defineEmits<{
    (e: 'updated' | 'deleted'): void
  }>()
  const modelValue = defineModel<boolean>({ default: false })
  const toast = useToast()
  const { isAdmin, canManageSchools } = usePermissions()
  const { parseIncidentMentions, updateIncidentStatus, deleteIncident, isSaving } =
    useSchoolIncidents()

  const statusConfig = computed(() => {
    if (!props.incident) return SCHOOL_INCIDENT_STATUS_MAP.new
    return SCHOOL_INCIDENT_STATUS_MAP[props.incident.status] || SCHOOL_INCIDENT_STATUS_MAP.new
  })

  const offenders = computed(() => {
    return props.incident?.participants?.filter((p) => p.role === 'offender') || []
  })

  const victims = computed(() => {
    return props.incident?.participants?.filter((p) => p.role === 'victim') || []
  })

  const parsedTokens = computed(() => {
    if (!props.incident?.description) return []
    return parseIncidentMentions(props.incident.description, props.incident.participants || [])
  })

  const formattedDate = computed(() => {
    if (!props.incident?.created_at) return ''
    const d = new Date(props.incident.created_at)
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
    if (!props.incident) return
    try {
      await updateIncidentStatus(props.incident.id, newStatus)
      toast.success('Status da ocorrência atualizado!')
      emit('updated')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar status.'
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    if (!props.incident) return
    const confirmed = window.confirm('Deseja realmente excluir esta ocorrência escolar?')
    if (!confirmed) return

    try {
      await deleteIncident(props.incident.id)
      toast.success('Ocorrência excluída com sucesso!')
      emit('deleted')
      modelValue.value = false
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir ocorrência.'
      toast.error(msg)
    }
  }
</script>

<template>
  <UiModal v-model="modelValue" max-width="840px" title="Detalhes da Ocorrência">
    <div v-if="incident" class="pa-4 d-flex flex-column gap-6">
      <!-- Cabeçalho de Status e Metadados -->
      <div class="d-flex flex-wrap align-center justify-space-between gap-3 pb-3 border-b">
        <div>
          <h2 class="text-h6 font-weight-bold mb-1">{{ incident.title }}</h2>
          <div class="d-flex align-center gap-3 text-caption text-medium-emphasis">
            <span>Registrado em {{ formattedDate }}</span>
            <span v-if="incident.author?.name">• Por {{ incident.author.name }}</span>
          </div>
        </div>

        <div class="d-flex align-center gap-2">
          <UiChip :color="statusConfig.color" size="md" :variant="statusConfig.variant">
            <UiIcon class="mr-1" :name="statusConfig.icon" size="16" />
            {{ statusConfig.label }}
          </UiChip>
        </div>
      </div>

      <!-- Ofensores e Vítimas -->
      <UiRow>
        <UiCol cols="12" md="6">
          <UiCard border class="pa-3 h-100" elevation="0" rounded="lg">
            <div class="d-flex align-center gap-2 mb-3">
              <UiIcon color="warning" name="alert" size="18" />
              <h4 class="text-subtitle-2 font-weight-bold">Ofensores ({{ offenders.length }})</h4>
            </div>

            <div class="d-flex flex-column gap-2">
              <div
                v-for="off in offenders"
                :key="off.id"
                class="pa-2 rounded bg-surface d-flex align-center justify-space-between"
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

        <UiCol cols="12" md="6">
          <UiCard border class="pa-3 h-100" elevation="0" rounded="lg">
            <div class="d-flex align-center gap-2 mb-3">
              <UiIcon color="info" name="shieldUser" size="18" />
              <h4 class="text-subtitle-2 font-weight-bold">Vítimas ({{ victims.length }})</h4>
            </div>

            <div v-if="victims.length === 0" class="text-caption text-medium-emphasis py-2">
              Nenhuma vítima identificada ou registrada.
            </div>

            <div v-else class="d-flex flex-column gap-2">
              <div
                v-for="vic in victims"
                :key="vic.id"
                class="pa-2 rounded bg-surface d-flex align-center justify-space-between"
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
      <UiCard border class="pa-4 bg-surface" elevation="0" rounded="lg">
        <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center gap-2">
          <UiIcon name="history" size="18" />
          Histórico e Relato do Fato
        </h4>

        <div class="text-body-1 text-high-emphasis lh-relaxed" style="white-space: pre-wrap">
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
      </UiCard>

      <!-- Declaração de Conformidade Registrada -->
      <div class="d-flex align-center gap-2 text-caption text-success">
        <UiIcon name="check" size="16" />
        <span>Termo de conformidade e proteção de dados aceito no momento do registro.</span>
      </div>

      <!-- Gerenciamento de Status (Gestor / Admin) -->
      <div v-if="canChangeStatus" class="pa-3 rounded-lg bg-surface-variant">
        <span class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">
          Avançar / Alterar Status da Ocorrência:
        </span>
        <div class="d-flex flex-wrap gap-2">
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.NEW"
            :disabled="isSaving"
            size="xs"
            variant="outline"
            @click="handleStatusChange('new')"
          >
            Marcar como Nova
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.UNDER_REVIEW"
            color="warning"
            :disabled="isSaving"
            size="xs"
            variant="outline"
            @click="handleStatusChange('under_review')"
          >
            Em Análise
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.IN_PROGRESS"
            color="primary"
            :disabled="isSaving"
            size="xs"
            variant="outline"
            @click="handleStatusChange('in_progress')"
          >
            Em Andamento
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.RESOLVED"
            color="success"
            :disabled="isSaving"
            size="xs"
            variant="solid"
            @click="handleStatusChange('resolved')"
          >
            Resolver Ocorrência
          </UiButton>
          <UiButton
            v-if="incident.status !== SCHOOL_INCIDENT_STATUS.ARCHIVED"
            :disabled="isSaving"
            size="xs"
            variant="ghost"
            @click="handleStatusChange('archived')"
          >
            Arquivar
          </UiButton>
        </div>
      </div>
    </div>

    <template #actions>
      <UiButton
        v-if="isAdmin"
        color="error"
        :disabled="isSaving"
        variant="ghost"
        @click="handleDelete"
      >
        Excluir Ocorrência
      </UiButton>
      <UiSpacer />
      <UiButton variant="ghost" @click="modelValue = false"> Fechar </UiButton>
    </template>
  </UiModal>
</template>
