<script setup lang="ts">
  import { computed } from 'vue'
  import { useProfile } from '~/composables/useProfile'
  import { ROLE_LABELS } from '~/constants/roles'
  import type { UserRole } from '~/types/route-meta'

  definePageMeta({
    icon: 'vote',
    middleware: ['elections'],
    layout: 'default',
    navLabel: 'Eleições',
    navSubtitle: 'Sistema de eleições e votação',
    navColor: 'indigo',
    navGroup: 'elections',
    navOrder: 10,
    roles: ['admin', 'user-election', 'manager-election', 'admin-election'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Sistema de Eleições',
  })

  const { profile } = useProfile()

  const currentRoleLabel = computed(() => {
    const role = profile.value?.role as UserRole | undefined
    return role ? ROLE_LABELS[role] || role : 'Não identificado'
  })

  interface ElectionModule {
    title: string
    description: string
    icon: string
    color: string
    badge: string
    available: boolean
  }

  const modules: ElectionModule[] = [
    {
      title: 'Processos Eleitorais',
      description: 'Configuração de pleitos, calendário eleitoral e regras de votação.',
      icon: 'calendarOutline',
      color: 'indigo',
      badge: 'Em breve',
      available: false,
    },
    {
      title: 'Chapas & Candidaturas',
      description: 'Gestão de chapas inscritas, homologação e perfis de candidatos.',
      icon: 'usersGroup',
      color: 'teal',
      badge: 'Em breve',
      available: false,
    },
    {
      title: 'Cabine de Votação',
      description: 'Urna digital segura com confirmação de voto e comprovante de participação.',
      icon: 'vote',
      color: 'primary',
      badge: 'Em breve',
      available: false,
    },
    {
      title: 'Apuração & Resultados',
      description: 'Totalização de votos em tempo real com emissão de boletins de urna.',
      icon: 'chart',
      color: 'deep-purple',
      badge: 'Em breve',
      available: false,
    },
  ]
</script>

<template>
  <UiContainer class="py-6" max-width="1400px">
    <PageHeader
      icon="vote"
      subtitle="Módulo de gestão de pleitos, votação e apuração de resultados"
      title="Sistema de Eleições"
    >
      <template #actions>
        <div class="d-flex align-center ga-2">
          <UiChip color="indigo" size="sm" variant="soft">
            <UiIcon class="mr-1" name="shieldUser" size="14" />
            Nível: {{ currentRoleLabel }}
          </UiChip>
        </div>
      </template>
    </PageHeader>

    <!-- Banner Informativo -->
    <UiAlert class="mb-6" color="indigo" variant="soft">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="font-weight-bold mb-1">Módulo de Eleições Ativo</div>
          <div class="text-body-2">
            Bem-vindo ao ambiente de eleições. O sistema está configurado para seu perfil de acesso
            <strong>{{ currentRoleLabel }}</strong
            >.
          </div>
        </div>
        <UiChip color="indigo" size="xs" variant="solid">Ambiente Seguro</UiChip>
      </div>
    </UiAlert>

    <!-- Grid de Módulos -->
    <UiRow class="g-4">
      <UiCol v-for="item in modules" :key="item.title" cols="12" lg="3" md="6">
        <UiCard class="h-100 d-flex flex-column" hover variant="elevated">
          <template #header>
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center ga-2">
                <UiIcon :color="item.color" :name="item.icon" size="22" />
                <span class="font-weight-bold text-subtitle-2">{{ item.title }}</span>
              </div>
              <UiChip :color="item.color" size="xs" variant="soft">
                {{ item.badge }}
              </UiChip>
            </div>
          </template>

          <div class="text-body-2 text-medium-emphasis flex-grow-1 mb-4">
            {{ item.description }}
          </div>

          <template #actions>
            <UiButton
              block
              :color="item.color"
              :disabled="!item.available"
              size="sm"
              variant="outline"
            >
              {{ item.available ? 'Acessar' : 'Aguardando Liberação' }}
            </UiButton>
          </template>
        </UiCard>
      </UiCol>
    </UiRow>
  </UiContainer>
</template>
