<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { usePermissions } from '~/composables/usePermissions'
  import { useSchoolIncidents } from '~/composables/useSchoolIncidents'
  import { USER_ROLE_CONFIG } from '~/constants/roles'

  definePageMeta({
    icon: 'school',
    middleware: ['schools'],
    layout: 'default',
    navLabel: 'Escola',
    navSubtitle: 'Módulo de Gestão Escolar',
    navColor: 'primary',
    navGroup: 'schools',
    navOrder: 1,
    roles: ['admin', 'school-manager', 'school-user'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Módulo Escola',
  })

  const { profile } = useProfile()
  const { isAdmin, canManageSchools } = usePermissions()
  const { incidents, fetchIncidents } = useSchoolIncidents()

  const currentRole = computed(() => profile.value?.role || 'school-user')
  const roleConfig = computed(
    () =>
      USER_ROLE_CONFIG[currentRole.value] || {
        label: currentRole.value,
        color: 'primary',
        variant: 'flat',
      },
  )

  const roleDescription = computed(() => {
    if (isAdmin.value) {
      return 'Você possui acesso total como Administrador.'
    }
    if (canManageSchools()) {
      return 'Você possui perfil de Gestor Escolar com privilégios de coordenação e gerenciamento de ocorrências.'
    }
    return 'Você possui perfil de Usuário com acesso ao registro e acompanhamento de suas ocorrências escolares.'
  })

  const newIncidentsCount = computed(() => {
    return incidents.value.filter((i) => i.status === 'new').length
  })

  onMounted(() => {
    fetchIncidents().catch(() => {})
  })
</script>

<template>
  <div class="d-flex flex-column gap-6">
    <!-- Cabeçalho da Página -->
    <UiPageHeader
      subtitle="Ambiente de gestão e acompanhamento das atividades escolares"
      title="Módulo Escola"
    >
      <template #actions>
        <UiChip :color="roleConfig.color" size="md" :variant="roleConfig.variant">
          <UiIcon class="mr-1" name="school" size="18" />
          {{ roleConfig.label }}
        </UiChip>
      </template>
    </UiPageHeader>

    <!-- Card de Boas-Vindas e Status do Módulo -->
    <UiCard border elevation="0" rounded="xl">
      <div class="pa-6">
        <div class="d-flex align-center gap-4 mb-2">
          <UiAvatar color="primary" rounded="lg" size="56" variant="ghost">
            <UiIcon name="school" size="32" />
          </UiAvatar>
          <div>
            <h2 class="text-h6 font-weight-bold">Ambiente Escolar</h2>
            <p class="text-body-2 text-medium-emphasis mt-1">
              {{ roleDescription }}
            </p>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Cards de Módulos / Funcionalidades -->
    <UiRow>
      <UiCol cols="12" lg="4" md="6">
        <UiCard
          border
          class="h-100 pa-5 d-flex flex-column justify-space-between"
          elevation="0"
          rounded="xl"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-4">
              <UiAvatar color="teal" rounded="lg" size="48" variant="soft">
                <UiIcon name="alert" size="24" />
              </UiAvatar>
              <UiChip v-if="newIncidentsCount > 0" color="info" size="sm" variant="solid">
                {{ newIncidentsCount }} nova(s)
              </UiChip>
            </div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">Ocorrências Escolares</h3>
            <p class="text-body-2 text-medium-emphasis">
              Registro formal de fatos ocorridos com identificação protegida de ofensores e vítimas,
              relato e controle de status.
            </p>
          </div>

          <div class="mt-6 pt-4 border-t d-flex align-center justify-space-between">
            <span class="text-caption text-medium-emphasis">
              Total: {{ incidents.length }} ocorrência(s)
            </span>
            <UiButton color="primary" size="sm" to="/schools/incidents" variant="solid">
              Acessar Ocorrências
            </UiButton>
          </div>
        </UiCard>
      </UiCol>
    </UiRow>
  </div>
</template>
