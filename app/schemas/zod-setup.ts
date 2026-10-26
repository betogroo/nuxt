import { z } from 'zod'

/** Define as mensagens padrão do Zod em português (PT-BR) para toda a aplicação. */
export const setupZod = (): void => {
  z.config(z.locales.pt())
}
