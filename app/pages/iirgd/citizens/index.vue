<script setup lang="ts">
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'

  definePageMeta({
    middleware: ['iirgd'],
    navLabel: 'Cidadãos (IIRGD)',
    icon: 'usersGroup',
    navGroup: 'iirgd',
    showIn: ['drawer'],
    navOrder: 2,
    roles: ['admin', 'iirgd'],
  })

  const { fetchCitizens } = useIirgdCitizens()

  const { data: citizens, pending } = useAsyncData('iirgd-citizens-list', async () => {
    try {
      return await fetchCitizens()
    } catch (e) {
      console.error(e)
      return []
    }
  })

  useHead({
    title: 'Cidadãos IIRGD',
  })
</script>

<template>
  <div>
    <PageHeader
      description="Listagem de todos os cidadãos com histórico de solicitações de liberação de documentos."
      title="Cidadãos"
    />

    <UiCard class="mt-6" variant="outlined">
      <UiTable
        :headers="[
          { text: 'Nome', value: 'name' },
          { text: 'RG', value: 'rg' },
          { text: 'CPF', value: 'cpf' },
          { text: 'Cadastrado Em', value: 'created_at', align: 'right' },
        ]"
        :items="citizens || []"
        :loading="pending"
      >
        <template #item-name="{ item }">
          <NuxtLink
            class="text-decoration-none text-primary font-weight-bold"
            :to="`/iirgd/citizens/${item.id}`"
          >
            {{ item.name }}
          </NuxtLink>
        </template>
        <template #item-rg="{ item }">
          {{ item.rg ? padAndFormatRg(item.rg, true) : '-' }}
        </template>
        <template #item-cpf="{ item }">
          {{ item.cpf ? formatCpf(item.cpf) : '-' }}
        </template>
        <template #item-created_at="{ item }">
          {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
        </template>
      </UiTable>
    </UiCard>
  </div>
</template>
