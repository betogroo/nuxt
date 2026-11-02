<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useCommitments } from '~/composables/useCommitments'
  import {
    DEMAND_ITEM_EXECUTION_STATUS_OPTIONS,
    formatDemandItemExecutionStatus,
    getDemandItemExecutionStatusColor,
    getDemandItemExecutionStatusIcon,
  } from '~/constants/demand-item-status'
  import { formatCnpj, formatCurrency, formatDate } from '~/utils/formatters'
  import { APP_ROUTES } from '~/utils/routes'

  definePageMeta({
    icon: 'document',
    middleware: ['uge'],
    navLabel: 'Notas de Empenho',
    navSubtitle: 'Acompanhamento de NE, Liquidação (NL), PD e Ordem Bancária (OB)',
    navColor: 'primary',
    navGroup: 'management',
    navOrder: 15,
    roles: ['admin', 'uge'],
    showIn: ['drawer', 'home'],
  })

  useHead({ title: 'Notas de Empenho (NE)' })

  const { fetchCommitments } = useCommitments()

  const searchQuery = ref('')
  const selectedStatus = ref<string>('all')

  const {
    data: commitments,
    pending,
    error: fetchError,
    refresh,
  } = useAsyncData('all-commitments-list', () => fetchCommitments(), {
    default: () => [],
  })

  onMounted(() => {
    refresh()
  })

  const statusFilterOptions = computed(() => [
    { title: 'Todos os Status', value: 'all' },
    ...DEMAND_ITEM_EXECUTION_STATUS_OPTIONS,
  ])

  const filteredCommitments = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return (commitments.value || []).filter((item) => {
      const matchesStatus = selectedStatus.value === 'all' || item.status === selectedStatus.value

      if (!matchesStatus) return false
      if (!q) return true

      const numberMatch = item.commitment_number.toLowerCase().includes(q)
      const supplierMatch =
        item.suppliers?.company_name?.toLowerCase().includes(q) ||
        item.suppliers?.cnpj?.toLowerCase().includes(q)
      const demandMatch =
        item.demands?.name?.toLowerCase().includes(q) ||
        item.demands?.internal_process_number?.toLowerCase().includes(q) ||
        item.demands?.process_number?.toLowerCase().includes(q)
      const nlMatch = (item.demand_commitment_liquidations || []).some((nl) =>
        nl.liquidation_number.toLowerCase().includes(q),
      )
      const pdMatch = item.disbursement_program_number?.toLowerCase().includes(q)
      const obMatch = item.bank_order_number?.toLowerCase().includes(q)

      return Boolean(numberMatch || supplierMatch || demandMatch || nlMatch || pdMatch || obMatch)
    })
  })

  const metrics = computed(() => {
    const list = commitments.value || []
    const total = list.length
    const awaitingLogistics = list.filter((c) =>
      [
        'awaiting_commitment',
        'commitment_issued',
        'commitment_sent',
        'commitment_confirmed',
        'shipped',
      ].includes(c.status),
    ).length
    const awaitingFinancial = list.filter((c) => c.status === 'delivered').length
    const completed = list.filter((c) => c.status === 'completed').length
    const totalAmount = list.reduce((sum, c) => sum + Number(c.total_amount || 0), 0)

    return {
      total,
      awaitingLogistics,
      awaitingFinancial,
      completed,
      totalAmount,
    }
  })

  const tableHeaders = [
    { text: 'Nota de Empenho', value: 'commitment_number' },
    { text: 'Demanda', value: 'demand' },
    { text: 'Fornecedor / Natureza', value: 'supplier' },
    { text: 'Itens / Valor Total', value: 'amount', align: 'right' as const },
    { text: 'Status Logístico', value: 'status', align: 'center' as const },
    { text: 'Execução Financeira (NL / PD / OB)', value: 'financial' },
    { text: 'Ações', value: 'actions', align: 'right' as const },
  ]
</script>

<template>
  <div>
    <!-- Cabeçalho -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-6 ga-3">
      <div>
        <div class="d-flex align-center ga-2">
          <UiIcon color="primary" name="document" size="28" />
          <h1 class="text-h5 font-weight-bold">Notas de Empenho (NE)</h1>
        </div>
        <div class="text-body-2 text-grey-darken-1 mt-1">
          Acompanhamento logístico e financeiro (Notas de Liquidação, Programa de Desembolso e Ordem
          Bancária)
        </div>
      </div>

      <div class="d-flex ga-2">
        <UiButton
          color="primary"
          :loading="pending"
          prepend-icon="refresh"
          variant="soft"
          @click="() => refresh()"
        >
          Atualizar
        </UiButton>
      </div>
    </div>

    <!-- Cards de Métricas -->
    <UiRow class="mb-6">
      <UiCol cols="12" md="3" sm="6">
        <UiCard class="pa-4 h-100" elevation="1" variant="outline">
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1">
            Total de Empenhos
          </div>
          <div class="text-h5 font-weight-bold mt-1">{{ metrics.total }}</div>
          <div class="text-caption text-primary font-weight-medium mt-1">
            {{ formatCurrency(metrics.totalAmount) }} empenhados
          </div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard class="pa-4 h-100" elevation="1" variant="outline">
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1">
            Em Trâmite Logístico
          </div>
          <div class="text-h5 font-weight-bold text-info mt-1">
            {{ metrics.awaitingLogistics }}
          </div>
          <div class="text-caption text-grey mt-1">Emissão, envio, transporte e entrega</div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard class="pa-4 h-100" elevation="1" variant="outline">
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1">
            Aguardando Financeiro (Entregues)
          </div>
          <div class="text-h5 font-weight-bold text-warning mt-1">
            {{ metrics.awaitingFinancial }}
          </div>
          <div class="text-caption text-grey mt-1">Pendentes de NL (mín. 2), PD ou OB</div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard class="pa-4 h-100" elevation="1" variant="outline">
          <div class="text-caption text-uppercase font-weight-bold text-grey-darken-1">
            Concluídos (OB Emitida)
          </div>
          <div class="text-h5 font-weight-bold text-success mt-1">{{ metrics.completed }}</div>
          <div class="text-caption text-grey mt-1">Ordem Bancária cadastrada</div>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Filtros -->
    <UiAlert v-if="fetchError" class="mb-4" type="error" variant="soft">
      <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
        <span>Erro ao carregar Notas de Empenho: {{ fetchError.message || fetchError }}</span>
        <UiButton color="error" size="xs" variant="outline" @click="() => refresh()">
          Tentar novamente
        </UiButton>
      </div>
    </UiAlert>

    <UiCard class="pa-4 mb-4" elevation="1" variant="outline">
      <UiRow align="center">
        <UiCol cols="12" md="7">
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar por NE (2026NE...), NL, PD, OB, fornecedor ou demanda"
            prepend-inner-icon="search"
            size="sm"
            variant="outline"
          />
        </UiCol>
        <UiCol cols="12" md="5">
          <UiSelect
            v-model="selectedStatus"
            hide-details
            item-title="title"
            item-value="value"
            :items="statusFilterOptions"
            label="Filtrar por Status"
            size="sm"
            variant="outline"
          />
        </UiCol>
      </UiRow>
    </UiCard>

    <!-- Tabela de Notas de Empenho -->
    <UiCard elevation="1" variant="outline">
      <UiTable :headers="tableHeaders" :items="filteredCommitments" :loading="pending">
        <template #empty>
          <div class="text-center py-6 text-grey">
            Nenhuma Nota de Empenho encontrada para os filtros selecionados.
          </div>
        </template>

        <template #item-commitment_number="{ item }">
          <NuxtLink
            class="text-decoration-none font-weight-bold text-primary d-inline-flex align-center ga-1"
            :to="APP_ROUTES.commitments.detail(item.commitment_number)"
          >
            <UiIcon name="document" size="16" />
            {{ item.commitment_number }}
          </NuxtLink>
          <div v-if="item.issue_date" class="text-caption text-grey">
            Emitida em {{ formatDate(item.issue_date) }}
          </div>
        </template>

        <template #item-demand="{ item }">
          <template v-if="item.demands">
            <NuxtLink
              class="text-decoration-none font-weight-medium text-high-emphasis"
              :to="`/demands/${item.demand_id}`"
            >
              {{ item.demands.name }}
            </NuxtLink>
            <div v-if="item.demands.internal_process_number" class="text-caption text-grey">
              Proc.: {{ item.demands.internal_process_number }}
            </div>
          </template>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item-supplier="{ item }">
          <div v-if="item.suppliers" class="font-weight-medium">
            {{ item.suppliers.company_name }}
            <span class="text-caption text-grey d-block">
              {{ formatCnpj(item.suppliers.cnpj) }}
            </span>
          </div>
          <span v-else class="text-caption text-grey">Fornecedor não vinculado</span>
          <div v-if="item.expense_natures" class="text-caption text-indigo mt-1">
            {{ item.expense_natures.name }}
          </div>
        </template>

        <template #item-amount="{ item }">
          <div class="font-weight-bold">{{ formatCurrency(item.total_amount) }}</div>
          <div class="text-caption text-grey">{{ item.items_count }} item(ns)</div>
        </template>

        <template #item-status="{ item }">
          <UiChip
            :color="getDemandItemExecutionStatusColor(item.status)"
            :prepend-icon="getDemandItemExecutionStatusIcon(item.status)"
            size="sm"
            variant="soft"
          >
            {{ formatDemandItemExecutionStatus(item.status) }}
          </UiChip>
        </template>

        <template #item-financial="{ item }">
          <div class="d-flex flex-wrap ga-1 align-center">
            <UiChip
              :color="
                (item.demand_commitment_liquidations?.length || 0) >= 2 ? 'success' : 'default'
              "
              size="xs"
              variant="soft"
            >
              NL: {{ item.demand_commitment_liquidations?.length || 0 }}/2+
            </UiChip>
            <UiChip
              :color="item.disbursement_program_number ? 'info' : 'default'"
              size="xs"
              variant="soft"
            >
              PD: {{ item.disbursement_program_number || 'Pendente' }}
            </UiChip>
            <UiChip
              :color="item.bank_order_number ? 'success' : 'default'"
              size="xs"
              variant="soft"
            >
              OB: {{ item.bank_order_number || 'Pendente' }}
            </UiChip>
          </div>
        </template>

        <template #item-actions="{ item }">
          <UiButton
            color="primary"
            prepend-icon="eye"
            size="sm"
            :to="APP_ROUTES.commitments.detail(item.commitment_number)"
            variant="soft"
          >
            Abrir NE
          </UiButton>
        </template>
      </UiTable>
    </UiCard>
  </div>
</template>
