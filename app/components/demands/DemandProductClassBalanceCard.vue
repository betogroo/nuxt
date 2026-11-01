<script setup lang="ts">
  import type { SingleClassBalanceResult } from '~/utils/demandClassBalanceTable'
  import { formatCurrency } from '~/utils/formatters'

  const props = withDefaults(
    defineProps<{
      balance?: SingleClassBalanceResult | null
      loading?: boolean
    }>(),
    {
      balance: null,
      loading: false,
    },
  )
</script>

<template>
  <div class="demand-class-balance-card mb-3">
    <!-- Estado de carregamento -->
    <UiCard v-if="loading" class="pa-3" variant="outline">
      <div class="d-flex align-center ga-2 text-medium-emphasis text-caption">
        <UiProgressCircular color="primary" indeterminate size="18" width="2" />
        <span>Consultando saldo da classe do produto...</span>
      </div>
    </UiCard>

    <!-- Estado sem classe vinculada -->
    <UiAlert
      v-else-if="balance && !balance.hasLinkedClass"
      class="mb-0"
      size="xs"
      type="info"
      variant="soft"
    >
      <div class="d-flex align-center ga-2">
        <UiIcon name="info" size="xs" />
        <span>
          Este produto não possui classe de material vinculada no catálogo. O controle de teto anual
          por classe não se aplica.
        </span>
      </div>
    </UiAlert>

    <!-- Estado com classe vinculada e saldo calculado -->
    <UiCard
      v-else-if="balance && balance.hasLinkedClass"
      class="pa-3"
      :style="{
        backgroundColor: balance.willExceedWithAddition
          ? 'rgba(239, 68, 68, 0.04)'
          : 'rgba(16, 185, 129, 0.03)',
        borderColor: balance.willExceedWithAddition
          ? 'rgba(239, 68, 68, 0.35)'
          : 'rgba(16, 185, 129, 0.35)',
      }"
      variant="outline"
    >
      <!-- Cabeçalho do Card -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 pb-2 border-b">
        <div class="d-flex align-center ga-2 flex-wrap">
          <UiChip color="primary" size="xs" variant="soft"> Classe {{ balance.classId }} </UiChip>
          <span class="text-caption font-weight-bold text-truncate" style="max-width: 320px">
            {{ balance.className }}
          </span>
        </div>
        <span class="text-caption text-medium-emphasis">
          Teto anual ({{ balance.year }}):
          <strong class="text-high-emphasis">{{ formatCurrency(balance.ceilingAmount) }}</strong>
        </span>
      </div>

      <!-- Resumo de Saldos e Empenhos -->
      <div class="d-flex flex-wrap align-center justify-space-between ga-2 pt-2 text-caption">
        <div class="d-flex flex-column">
          <span class="text-medium-emphasis">Empenhado em outras</span>
          <span class="font-weight-medium">{{
            formatCurrency(balance.committedInOtherDemands)
          }}</span>
        </div>

        <div class="d-flex flex-column">
          <span class="text-medium-emphasis">Nesta demanda</span>
          <span class="font-weight-medium">{{ formatCurrency(balance.currentDemandAmount) }}</span>
        </div>

        <div class="d-flex flex-column text-right">
          <span class="text-medium-emphasis">Saldo Disponível</span>
          <span
            class="font-weight-bold"
            :class="balance.isExceededCurrently ? 'text-error' : 'text-success'"
          >
            {{ formatCurrency(balance.currentBalance) }}
          </span>
        </div>
      </div>

      <!-- Impacto do item sendo inserido / editado (se informado) -->
      <div
        v-if="balance.additionAmount > 0"
        class="mt-2 pt-2 border-t d-flex flex-wrap align-center justify-space-between ga-2 text-caption"
      >
        <div class="d-flex align-center ga-1">
          <span class="text-medium-emphasis">Impacto deste item:</span>
          <span class="font-weight-medium">+ {{ formatCurrency(balance.additionAmount) }}</span>
        </div>

        <div class="d-flex align-center ga-1 text-right">
          <span class="text-medium-emphasis">Saldo após inserir:</span>
          <span
            class="font-weight-bold"
            :class="balance.willExceedWithAddition ? 'text-error' : 'text-success'"
          >
            {{ formatCurrency(balance.projectedBalance) }}
          </span>
        </div>
      </div>

      <!-- Alerta visual caso o saldo vá estourar com este item -->
      <UiAlert
        v-if="balance.willExceedWithAddition"
        class="mt-2 mb-0"
        size="xs"
        type="warning"
        variant="soft"
      >
        <div class="d-flex align-center ga-1">
          <UiIcon color="warning" name="warning" size="xs" />
          <span>
            Atenção: A inclusão deste item ultrapassará o teto da classe em
            <strong>{{ formatCurrency(Math.abs(balance.projectedBalance)) }}</strong
            >!
          </span>
        </div>
      </UiAlert>
    </UiCard>
  </div>
</template>
