import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

let _nextId = 0
const toasts = ref<Toast[]>([])
let _pendingConfirm: ((value: boolean) => void) | null = null
const confirmState = ref<{ message: string; open: boolean }>({ message: '', open: false })

export function useToast() {
  const show = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++_nextId
    toasts.value.push({ id, message, type, duration })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  const success = (message: string) => show(message, 'success')
  const error = (message: string) => show(message, 'error')
  const warning = (message: string) => show(message, 'warning')
  const info = (message: string) => show(message, 'info')
  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /**
   * Promise-based confirmation dialog — replaces native `confirm()`.
   * Usage: `if (!await toast.confirm('Deseja excluir?')) return`
   */
  const confirm = (message: string): Promise<boolean> => {
    confirmState.value = { message, open: true }
    return new Promise<boolean>((resolve) => {
      _pendingConfirm = resolve
    })
  }

  const _resolveConfirm = (value: boolean) => {
    confirmState.value.open = false
    if (_pendingConfirm) {
      const resolve = _pendingConfirm
      _pendingConfirm = null
      resolve(value)
    }
  }

  return {
    toasts,
    confirmState,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    confirm,
    _resolveConfirm,
  }
}
