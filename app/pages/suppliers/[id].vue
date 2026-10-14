<script setup lang="ts">
  import { useToast } from '~/composables/useToast'
  import { useZodForm } from '~/composables/useZodForm'
  import { supplierFormSchema, type SupplierFormInput } from '~/schemas/forms/supplier'
  import {
    formatCurrency,
    formatCnpj,
    formatDate,
    formatDateTime,
    formatDemandStatus,
    getDemandStatusColor,
  } from '~/utils/formatters'

  definePageMeta({
    middleware: ['uge'],
    roles: ['admin', 'uge'],
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const supplierId = computed(() => route.params.id as string)

  const { fetchSupplierById, fetchSupplierWonDemands, updateSupplier, toggleSupplierStatus } =
    useSuppliers()

  // Fetch supplier registration data
  const {
    data: supplier,
    pending: isSupplierLoading,
    refresh: refreshSupplier,
  } = useAsyncData(`supplier-detail-${supplierId.value}`, () => fetchSupplierById(supplierId.value))

  // Fetch won demands and metrics
  const { data: wonSummary, pending: isWonLoading } = useAsyncData(
    `supplier-won-demands-${supplierId.value}`,
    () => fetchSupplierWonDemands(supplierId.value),
  )

  useHead({
    title: computed(() =>
      supplier.value?.company_name
        ? `${supplier.value.company_name} - Detalhes do Fornecedor`
        : 'Detalhes do Fornecedor',
    ),
  })

  // Edit Modal & Form State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const defaultForm = {
    id: '',
    cnpj: '',
    company_name: '',
    responsible_name: '',
    email: '',
    cell_phone: '',
    landline: '',
    address: '',
    has_bb_account: '',
    is_simples_optant: false,
    simples_optant_verified_at: null as string | null,
    is_active: true,
  }

  const { errors, defineField, handleSubmit, resetForm } = useZodForm(
    supplierFormSchema,
    defaultForm,
  )

  const [cnpj, cnpjProps] = defineField('cnpj')
  const [companyName, companyNameProps] = defineField('company_name')
  const [responsibleName, responsibleNameProps] = defineField('responsible_name')
  const [email, emailProps] = defineField('email')
  const [cellPhone, cellPhoneProps] = defineField('cell_phone')
  const [landline, landlineProps] = defineField('landline')
  const [address, addressProps] = defineField('address')
  const [hasBbAccount, hasBbAccountProps] = defineField('has_bb_account')
  const [isSimplesOptant, isSimplesOptantProps] = defineField('is_simples_optant')
  const [isActive, isActiveProps] = defineField('is_active')

  const openEditModal = () => {
    if (!supplier.value) return
    resetForm({
      values: {
        id: supplier.value.id,
        cnpj: supplier.value.cnpj,
        company_name: supplier.value.company_name,
        responsible_name: supplier.value.responsible_name || '',
        email: supplier.value.email || '',
        cell_phone: supplier.value.cell_phone || '',
        landline: supplier.value.landline || '',
        address: supplier.value.address || '',
        has_bb_account: supplier.value.has_bb_account || '',
        is_simples_optant: supplier.value.is_simples_optant ?? false,
        simples_optant_verified_at: supplier.value.simples_optant_verified_at || null,
        is_active: supplier.value.is_active ?? true,
      },
    })
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveSupplier = handleSubmit(async (values: SupplierFormInput) => {
    isSaving.value = true
    saveError.value = ''

    try {
      let verifiedAt = values.simples_optant_verified_at
      if (supplier.value && supplier.value.is_simples_optant !== values.is_simples_optant) {
        verifiedAt = new Date().toISOString()
      }

      const payload = {
        cnpj: values.cnpj,
        company_name: values.company_name,
        responsible_name: values.responsible_name || null,
        email: values.email,
        cell_phone: values.cell_phone || null,
        landline: values.landline || null,
        address: values.address || null,
        has_bb_account: values.has_bb_account || null,
        is_simples_optant: values.is_simples_optant,
        simples_optant_verified_at: verifiedAt,
        is_active: values.is_active,
      }

      await updateSupplier(supplierId.value, payload)
      toast.success('Fornecedor atualizado com sucesso!')
      closeModal()
      await refreshSupplier()
    } catch (err: unknown) {
      console.error(err)
      saveError.value = 'Erro ao salvar fornecedor. Verifique os dados e tente novamente.'
    } finally {
      isSaving.value = false
    }
  })

  // Status toggle
  const isTogglingStatus = ref(false)
  const handleToggleStatus = async () => {
    if (!supplier.value) return
    isTogglingStatus.value = true
    try {
      await toggleSupplierStatus(supplier.value)
      toast.success(
        `Fornecedor ${!supplier.value.is_active ? 'ativado' : 'inativado'} com sucesso!`,
      )
      await refreshSupplier()
    } catch (err: unknown) {
      console.error(err)
      toast.error('Erro ao alterar status do fornecedor.')
    } finally {
      isTogglingStatus.value = false
    }
  }

  const goBack = () => {
    router.push('/suppliers')
  }

  // Headers for won demands table
  const demandHeaders = [
    { text: 'Demanda', value: 'demand_name' },
    { text: 'Nº Processo', value: 'process_number' },
    { text: 'Status', value: 'status', align: 'center' as const },
    { text: 'Data Disputa', value: 'dispute_date', align: 'center' as const },
    { text: 'Itens Ganhos', value: 'items_count', align: 'center' as const },
    { text: 'Total Vencido', value: 'total_amount', align: 'right' as const },
    { text: 'Ações', value: 'actions', align: 'right' as const },
  ]
</script>

<template>
  <UiContainer>
    <!-- Top Bar with Navigation and Actions -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div class="d-flex align-center ga-2">
        <UiButton color="default" icon="arrowLeft" size="sm" variant="ghost" @click="goBack" />
        <div>
          <div class="d-flex align-center ga-2 flex-wrap">
            <h1 class="text-h5 font-weight-bold">
              {{ supplier?.company_name || 'Fornecedor' }}
            </h1>
            <UiChip
              v-if="supplier"
              :color="supplier.is_active ? 'success' : 'error'"
              size="sm"
              variant="solid"
            >
              {{ supplier.is_active ? 'ATIVO' : 'INATIVO' }}
            </UiChip>
            <UiChip v-if="supplier?.is_simples_optant" color="info" size="sm" variant="soft">
              Simples Nacional
            </UiChip>
          </div>
          <div class="text-caption text-medium-emphasis">
            CNPJ: {{ formatCnpj(supplier?.cnpj) }}
          </div>
        </div>
      </div>

      <div class="d-flex align-center ga-2">
        <UiButton color="primary" icon="edit" size="sm" variant="outline" @click="openEditModal">
          Editar Fornecedor
        </UiButton>
        <UiButton
          v-if="supplier"
          :color="supplier.is_active ? 'warning' : 'success'"
          :loading="isTogglingStatus"
          size="sm"
          variant="soft"
          @click="handleToggleStatus"
        >
          {{ supplier.is_active ? 'Inativar Fornecedor' : 'Ativar Fornecedor' }}
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isSupplierLoading" class="text-center py-10">
      <UiProgressCircular color="primary" indeterminate size="48" />
    </div>

    <template v-else-if="supplier">
      <UiRow class="mb-4">
        <!-- Registration Data Card -->
        <UiCol cols="12">
          <UiCard title="Dados Cadastrais" variant="outline">
            <div class="pa-4">
              <UiRow>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Razão Social
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    {{ supplier.company_name }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    CNPJ
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    {{ formatCnpj(supplier.cnpj) }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Responsável
                  </div>
                  <div class="text-body-1">
                    {{ supplier.responsible_name || '-' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    E-mail
                  </div>
                  <div class="text-body-1">
                    {{ supplier.email || '-' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Telefone Celular
                  </div>
                  <div class="text-body-1">
                    {{ supplier.cell_phone || '-' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Telefone Fixo
                  </div>
                  <div class="text-body-1">
                    {{ supplier.landline || '-' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="8">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Endereço
                  </div>
                  <div class="text-body-1">
                    {{ supplier.address || '-' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Conta Banco do Brasil
                  </div>
                  <div class="text-body-1">
                    {{ supplier.has_bb_account || 'Não cadastrada' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Optante Simples Nacional
                  </div>
                  <div class="d-flex align-center ga-2 mt-1">
                    <UiChip
                      :color="supplier.is_simples_optant ? 'success' : 'default'"
                      size="sm"
                      variant="soft"
                    >
                      {{ supplier.is_simples_optant ? 'Sim' : 'Não' }}
                    </UiChip>
                    <span
                      v-if="supplier.simples_optant_verified_at"
                      class="text-caption text-medium-emphasis"
                    >
                      (Verificado em: {{ formatDate(supplier.simples_optant_verified_at) }})
                    </span>
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Data de Cadastro
                  </div>
                  <div class="text-body-1">
                    {{ formatDateTime(supplier.created_at) }}
                  </div>
                </UiCol>
              </UiRow>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Summary KPIs Section -->
      <div class="mb-4">
        <h2 class="text-h6 font-weight-bold mb-3">Resumo de Demandas Vencidas</h2>
        <UiRow>
          <!-- Total Demands Won -->
          <UiCol cols="12" lg="3" sm="6">
            <UiCard variant="outline">
              <div class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Demandas Vencidas
                  </span>
                  <UiIcon color="primary" name="recordsList" size="24" />
                </div>
                <div class="text-h4 font-weight-bold text-primary">
                  {{ wonSummary?.totalDemandsWon ?? 0 }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Demandas com itens arrematados
                </div>
              </div>
            </UiCard>
          </UiCol>

          <!-- Total Items Won -->
          <UiCol cols="12" lg="3" sm="6">
            <UiCard variant="outline">
              <div class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Itens Arrematados
                  </span>
                  <UiIcon color="primary" name="product" size="24" />
                </div>
                <div class="text-h4 font-weight-bold text-primary">
                  {{ wonSummary?.totalItemsWon ?? 0 }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Total de produtos / lotes vencidos
                </div>
              </div>
            </UiCard>
          </UiCol>

          <!-- Total Amount Won -->
          <UiCol cols="12" lg="3" sm="6">
            <UiCard variant="outline">
              <div class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Total Arrematado
                  </span>
                  <UiIcon color="success" name="finances" size="24" />
                </div>
                <div class="text-h4 font-weight-bold text-success">
                  {{ formatCurrency(wonSummary?.totalAmountWon ?? 0) }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">Volume financeiro total</div>
              </div>
            </UiCard>
          </UiCol>

          <!-- Average Demand Amount -->
          <UiCol cols="12" lg="3" sm="6">
            <UiCard variant="outline">
              <div class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Ticket Médio
                  </span>
                  <UiIcon color="secondary" name="chart" size="24" />
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ formatCurrency(wonSummary?.averageDemandAmount ?? 0) }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">Média por demanda ganha</div>
              </div>
            </UiCard>
          </UiCol>
        </UiRow>
      </div>

      <!-- Won Demands Table -->
      <UiRow>
        <UiCol cols="12">
          <UiCard title="Lista de Demandas Vencidas" variant="outline">
            <UiTable
              :headers="demandHeaders"
              :items="wonSummary?.demands || []"
              :loading="isWonLoading"
            >
              <template #item-demand_name="{ item }">
                <NuxtLink
                  class="text-primary font-weight-medium text-decoration-none"
                  :to="`/demands/${item.demand_id}`"
                >
                  {{ item.demand_name }}
                </NuxtLink>
              </template>

              <template #item-process_number="{ item }">
                <span class="text-body-2">{{ item.process_number || '-' }}</span>
              </template>

              <template #item-status="{ item }">
                <UiChip :color="getDemandStatusColor(item.status)" size="sm" variant="soft">
                  {{ formatDemandStatus(item.status) }}
                </UiChip>
              </template>

              <template #item-dispute_date="{ item }">
                <span class="text-body-2">{{ formatDate(item.dispute_date) }}</span>
              </template>

              <template #item-items_count="{ item }">
                <UiChip size="sm" variant="outline">
                  {{ item.items_count }} {{ item.items_count === 1 ? 'item' : 'itens' }}
                </UiChip>
              </template>

              <template #item-total_amount="{ item }">
                <span class="font-weight-bold text-success">
                  {{ formatCurrency(item.total_amount) }}
                </span>
              </template>

              <template #item-actions="{ item }">
                <UiTooltip text="Ver itens arrematados">
                  <UiButton
                    color="primary"
                    icon="recordsList"
                    size="sm"
                    variant="ghost"
                    @click="router.push(`/demands/${item.demand_id}/suppliers/${supplierId}`)"
                  />
                </UiTooltip>
              </template>

              <template #empty>
                <div class="text-center py-4">
                  <div class="text-body-1 font-weight-medium">
                    Nenhuma demanda vencida encontrada
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Este fornecedor ainda não se sagrou vencedor de nenhum item ou demanda
                    cadastrada.
                  </div>
                </div>
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>
    </template>

    <!-- Supplier Not Found -->
    <UiAlert v-else class="my-4" type="error" variant="soft">
      Fornecedor não encontrado ou removido.
    </UiAlert>

    <!-- Edit Supplier Modal -->
    <UiModal
      v-model="isModalOpen"
      max-width="700px"
      scrollable
      title="Editar Fornecedor"
      transparent-header
    >
      <div class="pa-0" style="max-height: 60vh; overflow-y: auto">
        <div class="pa-4">
          <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
            {{ saveError }}
          </UiAlert>

          <UiRow>
            <UiCol cols="12" md="4">
              <UiInput
                v-model="cnpj"
                v-bind="cnpjProps"
                :error-messages="errors.cnpj"
                label="CNPJ *"
                required
              />
            </UiCol>
            <UiCol cols="12" md="8">
              <UiInput
                v-model="companyName"
                v-bind="companyNameProps"
                :error-messages="errors.company_name"
                label="Nome da Empresa *"
                required
              />
            </UiCol>

            <UiCol cols="12" md="6">
              <UiInput
                v-model="responsibleName"
                v-bind="responsibleNameProps"
                :error-messages="errors.responsible_name"
                label="Nome do Responsável"
              />
            </UiCol>
            <UiCol cols="12" md="6">
              <UiInput
                v-model="email"
                v-bind="emailProps"
                :error-messages="errors.email"
                label="E-mail *"
                required
                type="email"
              />
            </UiCol>

            <UiCol cols="12" md="6">
              <UiInput
                v-model="cellPhone"
                v-bind="cellPhoneProps"
                :error-messages="errors.cell_phone"
                label="Telefone Celular"
              />
            </UiCol>
            <UiCol cols="12" md="6">
              <UiInput
                v-model="landline"
                v-bind="landlineProps"
                :error-messages="errors.landline"
                label="Telefone Fixo"
              />
            </UiCol>

            <UiCol cols="12">
              <UiInput
                v-model="address"
                v-bind="addressProps"
                :error-messages="errors.address"
                label="Endereço"
              />
            </UiCol>

            <UiCol cols="12">
              <UiInput
                v-model="hasBbAccount"
                v-bind="hasBbAccountProps"
                :error-messages="errors.has_bb_account"
                hint="Ex: Ag: 1234-5, CC: 12345-6"
                label="Conta no Banco do Brasil"
                persistent-hint
              />
            </UiCol>

            <UiCol cols="12">
              <UiSwitch
                v-model="isSimplesOptant"
                v-bind="isSimplesOptantProps"
                color="primary"
                :error-messages="errors.is_simples_optant"
                hint="A data e hora da verificação serão salvas automaticamente."
                label="Optante pelo Simples Nacional"
                persistent-hint
              />
            </UiCol>

            <UiCol cols="12">
              <UiSwitch
                v-model="isActive"
                v-bind="isActiveProps"
                color="success"
                :error-messages="errors.is_active"
                hint="Indica se o fornecedor está ativo no sistema"
                label="Fornecedor Ativo"
                persistent-hint
              />
            </UiCol>
          </UiRow>
        </div>
      </div>

      <UiDivider />

      <template #actions>
        <UiButton :disabled="isSaving" variant="ghost" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveSupplier"> Salvar </UiButton>
      </template>
    </UiModal>
  </UiContainer>
</template>
