export function getErrorMessage(error: unknown, customEntityName?: string): string {
  if (!error) {
    return 'Ocorreu um erro inesperado.'
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as {
      code?: string | number
      message?: string
      details?: string
      hint?: string
    }

    // Foreign key violation
    if (err.code === '23503' || String(err.code) === '23503') {
      const entity = customEntityName ? customEntityName : 'este item'
      return `Não é possível excluir ${entity} pois já está vinculado a outros registros no sistema.`
    }

    // Unique key violation
    if (err.code === '23505' || String(err.code) === '23505') {
      return 'Já existe um registro com este mesmo código ou identificador.'
    }

    if (err.message && typeof err.message === 'string') {
      return err.message
    }

    if (err.details && typeof err.details === 'string') {
      return err.details
    }

    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }

  return String(error)
}
