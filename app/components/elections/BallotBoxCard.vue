<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { BallotBoxRow } from '~/types/ballot-box'
  import type { ElectionStatus, ElectionVotingMode } from '~/types/election'

  const props = withDefaults(
    defineProps<{
      ballotBox: BallotBoxRow
      electionStatus?: ElectionStatus
      votingMode?: ElectionVotingMode
      canManage?: boolean
      isToggling?: boolean
      isReleasingVoter?: boolean
    }>(),
    {
      electionStatus: 'awaiting_release',
      votingMode: 'simple',
      canManage: false,
      isToggling: false,
      isReleasingVoter: false,
    },
  )

  const emit = defineEmits<{
    (e: 'toggle', box: BallotBoxRow, active: boolean): void
    (e: 'releaseForVoter', box: BallotBoxRow, voterRegistrationNumber: string): void
    (e: 'edit' | 'delete' | 'openTerminal', box: BallotBoxRow): void
  }>()

  const voterRegistrationNumber = ref('')

  const isActive = computed(() => props.ballotBox.is_active)
  const isMonitoredMode = computed(() => props.votingMode === 'monitored')
  const isElectionReleased = computed(() => props.electionStatus === 'released')

  const handleToggle = () => {
    emit('toggle', props.ballotBox, !isActive.value)
  }

  const handleOpenTerminal = () => {
    emit('openTerminal', props.ballotBox)
  }

  const handleReleaseForVoter = () => {
    const clean = voterRegistrationNumber.value.trim()
    if (!clean) return
    emit('releaseForVoter', props.ballotBox, clean)
    voterRegistrationNumber.value = ''
  }
</script>

<template>
  <UiCard
    class="ballot-box-card h-100 transition-swing"
    :class="{
      'ballot-box-active border-success': isActive,
      'ballot-box-inactive border-error': !isActive,
    }"
    variant="outline"
  >
    <div class="pa-4 d-flex flex-column justify-space-between h-100">
      <!-- Cabeçalho do Card -->
      <div>
        <div class="d-flex align-center justify-space-between mb-3 ga-2">
          <div class="d-flex align-center ga-2 min-width-0">
            <UiAvatar :color="isActive ? 'success' : 'error'" rounded="lg" size="40">
              <UiIcon color="white" name="vote" size="22" />
            </UiAvatar>
            <div class="min-width-0">
              <h4 class="text-subtitle-1 font-weight-bold text-truncate mb-0">
                {{ ballotBox.name }}
              </h4>
              <span class="text-caption text-medium-emphasis text-truncate d-block">
                {{ ballotBox.device_info || 'Equipamento físico não especificado' }}
              </span>
            </div>
          </div>

          <!-- Status da Urna em Realtime -->
          <UiChip :color="isActive ? 'success' : 'error'" label size="sm" variant="flat">
            <UiIcon class="mr-1" :name="isActive ? 'check' : 'close'" size="14" />
            {{
              isActive
                ? 'Ativa'
                : isMonitoredMode && isElectionReleased
                  ? 'Aguardando Eleitor'
                  : 'Desativada'
            }}
          </UiChip>
        </div>

        <div class="text-caption text-medium-emphasis mb-3">
          <div v-if="isActive" class="text-success font-weight-medium d-flex align-center ga-1">
            <UiIcon color="success" name="check" size="14" />
            {{
              isMonitoredMode
                ? 'Urna liberada para o eleitor votar agora'
                : 'Pronta para receber votos no dispositivo'
            }}
          </div>
          <div v-else class="text-error font-weight-medium d-flex align-center ga-1">
            <UiIcon color="error" name="close" size="14" />
            {{
              isMonitoredMode && isElectionReleased
                ? 'Aguardando digitação do título para liberar voto'
                : 'Votação pausada / bloqueada neste equipamento'
            }}
          </div>
        </div>

        <!-- Painel do Mesário (Modo Monitorado) -->
        <div
          v-if="canManage && isMonitoredMode && isElectionReleased && !isActive"
          class="pa-3 mb-3 rounded-lg border bg-surface-variant"
        >
          <div
            class="text-caption font-weight-bold text-high-emphasis mb-2 d-flex align-center ga-1"
          >
            <UiIcon color="indigo" name="userBadge" size="16" />
            <span>Liberação de Eleitor (Mesário)</span>
          </div>
          <div class="d-flex align-center ga-2">
            <UiInput
              v-model="voterRegistrationNumber"
              class="flex-grow-1"
              density="compact"
              :disabled="isReleasingVoter"
              hide-details
              label="Nº do Título do Eleitor"
              placeholder="Digite o nº do título..."
              size="sm"
              variant="outline"
              @keydown.enter.prevent="handleReleaseForVoter"
            />
            <UiButton
              color="success"
              :disabled="!voterRegistrationNumber.trim()"
              :loading="isReleasingVoter"
              prepend-icon="check"
              size="sm"
              variant="solid"
              @click="handleReleaseForVoter"
            >
              Liberar
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Rodapé com Ações -->
      <div class="pt-3 border-t">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2">
          <!-- Botão Abrir Urna no Dispositivo -->
          <UiButton
            :color="isActive ? 'primary' : 'default'"
            :disabled="!isActive && !isMonitoredMode"
            prepend-icon="externalLink"
            size="sm"
            :variant="isActive ? 'solid' : 'tonal'"
            @click="handleOpenTerminal"
          >
            Abrir Terminal
          </UiButton>

          <!-- Ações do Administrador / Gestor -->
          <div v-if="canManage" class="d-flex align-center ga-1">
            <!-- Alternar Ativação -->
            <UiButton
              v-if="!isMonitoredMode || isActive || !isElectionReleased"
              :color="isActive ? 'error' : 'success'"
              :loading="isToggling"
              prepend-icon="power"
              size="sm"
              variant="tonal"
              @click="handleToggle"
            >
              {{ isActive ? 'Desativar' : 'Ativar' }}
            </UiButton>

            <!-- Editar -->
            <UiButton icon="edit" size="sm" variant="ghost" @click="emit('edit', ballotBox)" />

            <!-- Excluir -->
            <UiButton
              color="error"
              icon="delete"
              size="sm"
              variant="ghost"
              @click="emit('delete', ballotBox)"
            />
          </div>
        </div>
      </div>
    </div>
  </UiCard>
</template>

<style scoped>
  .ballot-box-card {
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }
  .ballot-box-active {
    border-width: 2px !important;
  }
  .ballot-box-inactive {
    border-width: 1px !important;
    opacity: 0.95;
  }
</style>
