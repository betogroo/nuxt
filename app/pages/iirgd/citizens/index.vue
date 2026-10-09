<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'
  import { useZodForm } from '~/composables/useZodForm'
  import { iirgdCitizenFormSchema } from '~/schemas/forms/iirgd-citizen'
  import { usePagination } from '~/composables/usePagination'

  definePageMeta({
    middleware: ['iirgd'],
    navLabel: 'Cidadãos (IIRGD)',
    icon: 'usersGroup',
    navGroup: 'iirgd',
    showIn: ['drawer'],
    navOrder: 2,
    roles: ['admin', 'iirgd_user', 'iirgd_manager'],
  })

  const { fetchCitizens, createCitizen } = useIirgdCitizens()
  const toast = useToast()

  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const searchQuery = ref('')

  const {
    data: citizens,
    pending,
    refresh,
  } = useAsyncData(
    'iirgd-citizens-list',
    async () => {
      try {
        const res = await fetchCitizens({
          page: currentPage.value,
          itemsPerPage: itemsPerPage.value,
          searchQuery: searchQuery.value,
        })
        totalItems.value = res.count
        return res.data || []
      } catch (e) {
        console.error(e)
        return []
      }
    },
    {
      watch: [currentPage, searchQuery],
      default: () => [],
    },
  )

  watch(searchQuery, () => resetPage())

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

  const onSubmit = handleSubmit(async (values) => {
    isSaving.value = true
    saveError.value = ''
    try {
      await createCitizen({
        name: values.name,
        rg: values.rg || null,
        cpf: values.cpf || null,
      })
      isAddModalOpen.value = false
      toast.success('Cidadão cadastrado com sucesso!')
      await refresh()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : 'Erro ao salvar.'
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <div>
    <UiPageHeader
      subtitle="Listagem de todos os cidadãos com histórico de solicitações de liberação de documentos."
      title="Cidadãos"
    />

    <UiCard class="mt-6" variant="outline">
      <template #header>
        <div class="d-flex flex-wrap align-center w-100 ga-2">
          <UiIcon class="text-primary" left name="usersGroup" />
          <span>Cidadãos Cadastrados</span>
          <UiChip class="flex-shrink-0" color="primary" size="sm" variant="solid">
            {{ totalItems }}
          </UiChip>
          <div class="ml-auto d-flex align-center" style="gap: 8px">
            <UiButton
              color="secondary"
              icon="refresh"
              :loading="pending"
              size="sm"
              variant="soft"
              @click="refresh"
            />
            <UiButton color="primary" prepend-icon="add" @click="openAddModal">
              Adicionar Cidadão
            </UiButton>
          </div>
        </div>
      </template>

      <div class="px-4 pt-4 pb-2">
        <UiInput
          v-model="searchQuery"
          clearable
          hide-details
          icon="search"
          placeholder="Buscar cidadão por Nome, RG ou CPF"
        />
      </div>

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

      <template #actions>
        <UiPagination
          v-model="currentPage"
          class="mt-2"
          :length="totalPages"
          size="sm"
          :total-visible="5"
        />
      </template>
    </UiCard>

    <UiModal v-model="isAddModalOpen" max-width="500px" title="Novo Cidadão IIRGD">
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <form @submit.prevent="onSubmit">
        <UiInput
          v-model="name"
          class="mb-3"
          :error-messages="errors.name"
          label="Nome Completo *"
          v-bind="nameProps"
        />
        <UiRgInput
          v-model="rg"
          class="mb-3"
          :error-messages="errors.rg"
          label="Número do RG"
          v-bind="rgProps"
        />
        <UiCpfInput
          v-model="cpf"
          class="mb-3"
          :error-messages="errors.cpf"
          label="Número do CPF"
          v-bind="cpfProps"
        />

        <div class="d-flex justify-end gap-2 mt-4">
          <UiButton variant="ghost" @click="isAddModalOpen = false">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" type="submit" variant="solid">
            Salvar Cidadão
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
