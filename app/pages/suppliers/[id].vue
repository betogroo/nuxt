<script setup lang="ts">
  import { useToast } from '~/composables/useToast'
  import { formatCurrency, formatCnpj, formatDate, formatDateTime } from '~/utils/formatters'
  import { formatDemandStatus, getDemandStatusColor } from '~/utils/demandStatus'
  import SupplierFormModal from '~/components/suppliers/SupplierFormModal.vue'

  definePageMeta({
    middleware: ['uge'],
    roles: ['admin', 'uge'],
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const supplierId = computed(() => route.params.id as string)

  const { fetchSupplierById, fetchSupplierWonDemands, toggleSupplierStatus } = useSuppliers()

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
  // Edit Modal State
  const isModalOpen = ref(false)

  const openEditModal = () => {
    isModalOpen.value = true
  }

  const onSupplierSaved = async () => {
    await refreshSupplier()
  }

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
        <UiButton
          color="primary"
          prepend-icon="edit"
          size="sm"
          variant="outline"
          @click="openEditModal"
        >
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
                  <template #activator="{ props }">
                    <UiButton
                      v-bind="props"
                      color="primary"
                      icon="recordsList"
                      size="sm"
                      variant="ghost"
                      @click="router.push(`/demands/${item.demand_id}/suppliers/${supplierId}`)"
                    />
                  </template>
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
    <SupplierFormModal v-model="isModalOpen" :supplier="supplier" @saved="onSupplierSaved" />
  </UiContainer>
</template>
