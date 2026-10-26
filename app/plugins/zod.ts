import { setupZod } from '~/schemas/zod-setup'

export default defineNuxtPlugin(() => {
  setupZod()
})
