<script setup lang="ts">
  import { useToast } from '~/composables/useToast'

  const { toasts, confirmState, dismiss, _resolveConfirm } = useToast()

  const typeMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }
</script>

<template>
  <div>
    <!-- Toast Queue -->
    <div
      class="ui-toast-container"
      style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 420px;
        pointer-events: none;
      "
    >
      <UiAlert
        v-for="toast in toasts"
        :key="toast.id"
        class="ui-toast-item"
        closable
        size="sm"
        style="min-width: 280px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); pointer-events: auto"
        :type="typeMap[toast.type]"
        variant="solid"
        @click:close="dismiss(toast.id)"
      >
        {{ toast.message }}
      </UiAlert>
    </div>

    <!-- Confirm Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="confirmState.open"
          class="ui-confirm-backdrop"
          style="
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
          "
          @click.self="_resolveConfirm(false)"
        >
          <div style="max-width: 420px; width: 100%" @click.stop>
            <UiCard elevation="8" :title="'Confirmação'">
              <p class="text-body-1 mb-4">{{ confirmState.message }}</p>
              <template #actions>
                <UiButton variant="ghost" @click="_resolveConfirm(false)">Cancelar</UiButton>
                <UiButton color="error" @click="_resolveConfirm(true)">Confirmar</UiButton>
              </template>
            </UiCard>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.15s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
