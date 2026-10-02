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
        {{ greeting }}, {{ firstName }}! 👋
      </h1>
      <p class="text-body-2 text-medium-emphasis mt-1">Selecione um módulo abaixo para começar.</p>
      <UiDivider class="mt-4" />
    </div>

    <v-row>
      <v-col v-for="link in homeLinks" :key="link.path" cols="12" md="4" sm="6">
        <v-card
          border
          class="quick-link-card pa-1"
          elevation="0"
          hover
          rounded="xl"
          :to="link.path"
        >
          <v-card-text class="d-flex align-center gap-4 pa-5">
            <v-avatar :color="link.color" rounded="lg" size="52" variant="text">
              <UiIcon :name="link.icon" size="26" />
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold">{{ link.label }}</div>
              <div class="text-caption text-medium-emphasis mt-1">{{ link.subtitle }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
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
