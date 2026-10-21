<script setup lang="ts">
  import { computed } from 'vue'
  import type { BallotBoxRow } from '~/types/ballot-box'
  import type { ElectionStatus } from '~/types/election'

  const props = defineProps<{
    ballotBox: BallotBoxRow
    electionStatus?: ElectionStatus
    canManage?: boolean
    isToggling?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'toggle', box: BallotBoxRow, active: boolean): void
    (e: 'edit' | 'delete' | 'openTerminal', box: BallotBoxRow): void
  }>()

  const isActive = computed(() => props.ballotBox.is_active)

  const handleToggle = () => {
    emit('toggle', props.ballotBox, !isActive.value)
  }

  const handleOpenTerminal = () => {
    emit('openTerminal', props.ballotBox)
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
            {{ isActive ? 'Ativa' : 'Desativada' }}
          </UiChip>
        </div>

        <div class="text-caption text-medium-emphasis mb-3">
          <div v-if="isActive" class="text-success font-weight-medium d-flex align-center ga-1">
            <UiIcon color="success" name="check" size="14" />
            Pronta para receber votos no dispositivo
          </div>
          <div v-else class="text-error font-weight-medium d-flex align-center ga-1">
            <UiIcon color="error" name="close" size="14" />
            Votação pausada / bloqueada neste equipamento
          </div>
        </div>
      </div>

      <!-- Rodapé com Ações -->
      <div class="pt-3 border-t">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2">
          <!-- Botão Abrir Urna no Dispositivo -->
          <UiButton
            :color="isActive ? 'primary' : 'default'"
            :disabled="!isActive"
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
              :color="isActive ? 'error' : 'success'"
              :loading="isToggling"
              :prepend-icon="isActive ? 'power' : 'power'"
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
