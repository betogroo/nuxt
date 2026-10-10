<template>
  <div>
    <UiRow>
      <UiCol cols="12">
        <UiCard>
          <template #title>
            Relatórios IIRGD
          </template>
          <template #text>
            <p>Página de visualização e extração de relatórios do módulo IIRGD.</p>
          </template>
        </UiCard>
      </UiCol>
    </UiRow>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    icon: 'recordsList',
    middleware: ['iirgd'],
    layout: 'default',
    navLabel: 'Relatórios IIRGD',
    navSubtitle: 'Relatórios do módulo IIRGD',
    navColor: 'deep-purple',
    navGroup: 'iirgd',
    navOrder: 50,
    roles: ['admin', 'iirgd_manager'],
    showIn: ['drawer'],
  })

  useHead({
    title: 'Relatórios IIRGD',
  })
</script>
