<script setup lang="ts">
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'
  import { useZodForm } from '~/composables/useZodForm'
  import { iirgdCitizenFormSchema } from '~/schemas/forms/iirgd-citizen'

  definePageMeta({
    middleware: ['iirgd'],
    navLabel: 'Cidadãos (IIRGD)',
    icon: 'usersGroup',
    navGroup: 'iirgd',
    showIn: ['drawer'],
    navOrder: 2,
    roles: ['admin', 'iirgd'],
  })

  const { fetchCitizens, createCitizen } = useIirgdCitizens()

  const {
    data: citizens,
    pending,
    refresh,
  } = useAsyncData('iirgd-citizens-list', async () => {
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

  const isAddModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(iirgdCitizenFormSchema, {
    name: '',
    rg: '',
    cpf: '',
  })

  const [name, nameProps] = defineField('name')
  const [rg, rgProps] = defineField('rg', { validateOnModelUpdate: false })
  const [cpf, cpfProps] = defineField('cpf', { validateOnModelUpdate: false })

  const openAddModal = () => {
    resetForm()
    saveError.value = ''
    isAddModalOpen.value = true
  }

  const handleSave = handleSubmit(async (values) => {
    isSaving.value = true
    saveError.value = ''
    try {
      await createCitizen({
        name: values.name,
        rg: values.rg || null,
        cpf: values.cpf || null,
      })
      await refresh()
      isAddModalOpen.value = false
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <div>
    <PageHeader
      description="Listagem de todos os cidadãos com histórico de solicitações de liberação de documentos."
      title="Cidadãos"
    />

    <UiCard class="mt-6" variant="outlined">
      <template #header>
        <div class="d-flex flex-wrap align-center w-100 ga-2">
          <UiIcon class="mr-2 text-primary" left name="usersGroup" />
          <span>Cidadãos Cadastrados</span>
          <UiChip class="flex-shrink-0" color="primary" size="sm" variant="solid">
            {{ citizens?.length || 0 }}
          </UiChip>
          <div class="ml-auto">
            <UiButton color="primary" prepend-icon="add" @click="openAddModal">
              Adicionar Cidadão
            </UiButton>
          </div>
        </div>
      </template>

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

    <UiModal v-model="isAddModalOpen" max-width="500px" persistent title="Adicionar Cidadão">
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <form @submit.prevent="handleSave">
        <UiInput
          v-model="name"
          v-bind="nameProps"
          class="mb-3"
          :error-messages="errors.name"
          label="Nome"
        />

        <UiCpfInput
          v-model="cpf"
          v-bind="cpfProps"
          class="mb-3"
          :error-messages="errors.cpf"
          label="CPF *"
        />

        <UiRgInput
          v-model="rg"
          v-bind="rgProps"
          class="mb-3"
          :error-messages="errors.rg"
          label="RG (opcional, apenas números ou X)"
        />

        <div class="d-flex justify-end ga-2 mt-4">
          <UiButton color="grey" variant="ghost" @click="isAddModalOpen = false">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" type="submit">Salvar</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
