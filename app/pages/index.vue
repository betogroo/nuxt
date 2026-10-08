<script setup lang="ts">
  definePageMeta({
    icon: 'home',
    navLabel: 'Início',
    navGroup: 'public',
    navOrder: 1,
    roles: ['admin', 'uge', 'iirgd', 'user'],
    showIn: ['drawer'],
  })
  const title = 'Início'
  useHead({ title })

  const { profile } = useProfile()
  const user = useSupabaseUser()

  const { homeLinks } = useNavLinks()

  const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  })

  const firstName = computed(() => {
    const name = profile.value?.name || user.value?.email || ''
    return name.split(' ')[0] || name.split('@')[0]
  })
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-h5 font-weight-bold text-high-emphasis">
        {{ greeting }}{{ firstName ? `, ${firstName}` : '' }}! 👋
      </h1>
      <p class="text-body-2 text-medium-emphasis mt-1">Selecione um módulo abaixo para começar.</p>
      <UiDivider class="mt-4" />
    </div>

    <UiRow>
      <UiCol v-for="link in homeLinks" :key="link.path" cols="12" md="4" sm="6">
        <UiCard
          border
          class="quick-link-card pa-1"
          elevation="0"
          hover
          rounded="xl"
          :to="link.path"
        >
          <div class="d-flex align-center gap-4 w-100">
            <UiAvatar :color="link.color" rounded="lg" size="52" variant="ghost">
              <UiIcon :name="link.icon" size="26" />
            </UiAvatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold">{{ link.label }}</div>
              <div class="text-caption text-medium-emphasis mt-1">{{ link.subtitle }}</div>
            </div>
          </div>
        </UiCard>
      </UiCol>
    </UiRow>
  </div>
</template>

<style scoped>
  .quick-link-card {
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;
    text-decoration: none;
  }
  .quick-link-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
  }
</style>
