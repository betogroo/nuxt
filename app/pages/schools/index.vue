<script setup lang="ts">
  import { computed } from 'vue'
  import { usePermissions } from '~/composables/usePermissions'
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
      return 'Você possui perfil de Gestor Escolar com privilégios de coordenação e gerenciamento.'
    }
    return 'Você possui perfil de Usuário com acesso operacional ao módulo escolar.'
  })
</script>

<template>
  <div>
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
    <UiRow class="mt-4">
      <UiCol cols="12">
        <UiCard border elevation="0" rounded="xl">
          <div class="pa-6">
            <div class="d-flex align-center gap-4 mb-4">
              <UiAvatar color="primary" rounded="lg" size="56" variant="ghost">
                <UiIcon name="school" size="32" />
              </UiAvatar>
              <div>
                <h2 class="text-h6 font-weight-bold">Bem-vindo ao Módulo Escola</h2>
                <p class="text-body-2 text-medium-emphasis mt-1">
                  {{ roleDescription }}
                </p>
              </div>
            </div>

            <UiDivider class="my-4" />

            <UiAlert color="info" icon="info" variant="soft">
              Este módulo está ativo e configurado com controle de acesso para os perfis
              <strong>Administrador</strong>, <strong>Gestor Escola</strong> e
              <strong>Usuário Escola</strong>. Os recursos e cadastros do módulo serão
              disponibilizados em breve conforme novas diretrizes.
            </UiAlert>
          </div>
        </UiCard>
      </UiCol>
    </UiRow>
  </div>
</template>
