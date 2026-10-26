import { ref } from 'vue'

export function useModal<T = Record<string, unknown>>(defaultPayload?: T) {
  const isOpen = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  // Clonar o payload padrão se fornecido, ou usar objeto vazio
  const payload = ref<T>(defaultPayload ? JSON.parse(JSON.stringify(defaultPayload)) : ({} as T))

  const open = (data?: T) => {
    if (data) {
      payload.value = JSON.parse(JSON.stringify(data))
    } else if (defaultPayload) {
      payload.value = JSON.parse(JSON.stringify(defaultPayload))
    } else {
      payload.value = {} as T
    }
    error.value = ''
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    if (defaultPayload) {
      payload.value = JSON.parse(JSON.stringify(defaultPayload))
    } else {
      payload.value = {} as T
    }
  }

  const startSaving = () => {
    isSaving.value = true
    error.value = ''
  }

  const stopSaving = (errorMessage?: string) => {
    isSaving.value = false
    if (errorMessage) {
      error.value = errorMessage
    }
  }

  return {
    isOpen,
    isSaving,
    error,
    payload,
    open,
    close,
    startSaving,
    stopSaving,
  }
}
