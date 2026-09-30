<script setup lang="ts">
  definePageMeta({
    icon: 'mdi-home-outline',
  })
  const title = 'Início'
  useHead({ title })

  const { profile } = useProfile()
  const user = useSupabaseUser()

  interface QuickLink {
    title: string
    subtitle: string
    icon: string
    to: string
    color: string
    roles: string[]
  }

  const quickLinks: QuickLink[] = [
    {
      title: 'Demandas',
      subtitle: 'Gerencie processos e demandas de compras',
      icon: 'mdi-clipboard-list-outline',
      to: '/demands',
      color: 'primary',
      roles: ['admin', 'uge', 'user'],
    },
    {
      title: 'Produtos',
      subtitle: 'Catálogo de produtos e naturezas de despesa',
      icon: 'mdi-package',
      to: '/products',
      color: 'info',
      roles: ['admin', 'uge', 'user'],
    },
    {
      title: 'Fornecedores',
      subtitle: 'Cadastro e gestão de fornecedores',
      icon: 'mdi-truck-delivery-outline',
      to: '/suppliers',
      color: 'secondary',
      roles: ['admin', 'uge', 'user'],
    },
    {
      title: 'IIRGD',
      subtitle: 'Módulo de gestão IIRGD',
      icon: 'mdi-card-account-details-outline',
      to: '/iirgd',
      color: 'deep-purple',
      roles: ['admin', 'iirgd'],
    },
    {
      title: 'Painel Admin',
      subtitle: 'Métricas e atividade do sistema',
      icon: 'mdi-view-dashboard-outline',
      to: '/admin',
      color: 'success',
      roles: ['admin'],
    },
    {
      title: 'Usuários',
      subtitle: 'Gerenciar contas e permissões',
      icon: 'mdi-account-group-outline',
      to: '/users',
      color: 'warning',
      roles: ['admin'],
    },
  ]

  const visibleLinks = computed(() => {
    const role = profile.value?.role || 'user'
    return quickLinks.filter((link) => link.roles.includes(role))
  })

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
      <v-divider class="mt-4" />
    </div>

    <v-row>
      <v-col v-for="link in visibleLinks" :key="link.to" cols="12" md="4" sm="6">
        <v-card border class="quick-link-card pa-1" elevation="0" hover rounded="xl" :to="link.to">
          <v-card-text class="d-flex align-center gap-4 pa-5">
            <v-avatar :color="link.color" rounded="lg" size="52" variant="tonal">
              <v-icon :icon="link.icon" size="26" />
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold">{{ link.title }}</div>
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
