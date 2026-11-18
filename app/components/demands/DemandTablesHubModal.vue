<script setup lang="ts">
  import { computed } from 'vue'
  import {
    areAllBidIntervalsConfigured,
    getPendingBidIntervalItems,
    type DemandBidIntervalItem,
  } from '~/utils/demandBidIntervalsTable'
  import type { DemandTermsItem } from '~/utils/demandTermsOfReferenceTable'

  export type DemandHubItem = DemandBidIntervalItem & DemandTermsItem

  const props = withDefaults(
    defineProps<{
      demand?: Record<string, unknown> | null
      items?: DemandHubItem[] | null
    }>(),
    {
      demand: null,
      items: () => [],
    },
  )

  const emit = defineEmits<{
    openTermsTable: []
    openBidIntervalsTable: []
    openClassBalanceTable: []
    openInfoTable: []
  }>()

  const isModalOpen = defineModel<boolean>({ default: false })

  const itemsList = computed<DemandHubItem[]>(() => props.items || [])
  const itemsCount = computed(() => itemsList.value.length)

  const canGenerateBidIntervals = computed(() => areAllBidIntervalsConfigured(itemsList.value))
  const pendingBidIntervalsCount = computed(
    () => getPendingBidIntervalItems(itemsList.value).length,
  )

  const handleOpenTerms = () => {
    isModalOpen.value = false
    emit('openTermsTable')
  }

  const handleOpenBidIntervals = () => {
    if (!canGenerateBidIntervals.value) return
    isModalOpen.value = false
    emit('openBidIntervalsTable')
  }

  const handleOpenClassBalance = () => {
    isModalOpen.value = false
    emit('openClassBalanceTable')
  }

  const handleOpenInfo = () => {
    isModalOpen.value = false
    emit('openInfoTable')
  }
</script>

<template>
  <UiModal
    v-model="isModalOpen"
    max-width="840px"
    scrollable
    title="Central de Tabelas e Modelos de Contratação"
  >
    <div class="pa-4">
      <UiAlert class="mb-4" size="sm" type="info" variant="soft">
        <div class="text-caption">
          Selecione o modelo desejado para visualização e cópia formatada para o
          <strong>Compras.gov.br (CKEditor 4)</strong> ou documentos oficiais em Word/Excel.
        </div>
      </UiAlert>

      <UiRow dense>
        <!-- CARD 1: Termo de Referência (TR) -->
        <UiCol class="mb-3" cols="12" md="6">
          <UiCard class="h-100 d-flex flex-column pa-4 border" elevation="0">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center ga-2">
                <UiAvatar color="primary" rounded size="36">
                  <UiIcon name="searchDocument" size="20" />
                </UiAvatar>
                <div>
                  <div class="font-weight-bold text-subtitle-2">Termo de Referência (TR)</div>
                  <div class="text-caption text-medium-emphasis">Tabela Oficial do Objeto</div>
                </div>
              </div>
              <UiChip color="primary" size="xs" variant="soft">
                {{ itemsCount }} {{ itemsCount === 1 ? 'item' : 'itens' }}
              </UiChip>
            </div>

            <div class="text-caption text-medium-emphasis flex-grow-1 mb-4">
              Tabela descritiva completa com classe de materiais, especificações técnicas, códigos
              CATMAT/BEC, unidade e valores estimados de referência.
            </div>

            <div class="d-flex align-center justify-space-between pt-2 border-top">
              <span class="text-caption text-grey">Padrão Compras.gov.br</span>
              <UiButton
                color="primary"
                data-testid="btn-hub-open-terms"
                :disabled="itemsCount === 0"
                prepend-icon="copy"
                size="sm"
                variant="solid"
                @click="handleOpenTerms"
              >
                Gerar Tabela
              </UiButton>
            </div>
          </UiCard>
        </UiCol>

        <!-- CARD 2: Intervalos entre Lances (Disputa) -->
        <UiCol class="mb-3" cols="12" md="6">
          <UiCard class="h-100 d-flex flex-column pa-4 border" elevation="0">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center ga-2">
                <UiAvatar color="teal" rounded size="36">
                  <UiIcon name="timer" size="20" />
                </UiAvatar>
                <div>
                  <div class="font-weight-bold text-subtitle-2">Intervalos entre Lances</div>
                  <div class="text-caption text-medium-emphasis">Aviso & Disputa</div>
                </div>
              </div>
              <UiChip v-if="canGenerateBidIntervals" color="success" size="xs" variant="soft">
                Pronto para Disputa
              </UiChip>
              <UiChip v-else-if="itemsCount === 0" color="default" size="xs" variant="soft">
                Sem Itens
              </UiChip>
              <UiChip v-else color="warning" size="xs" variant="soft">
                {{ pendingBidIntervalsCount }} pendente(s)
              </UiChip>
            </div>

            <div class="text-caption text-medium-emphasis flex-grow-1 mb-4">
              Tabela com Item, Nome do Produto, Valor de Referência e Intervalo Mínimo de Lances (%
              ou R$). Requer que todos os itens tenham intervalo cadastrado.
            </div>

            <div class="d-flex align-center justify-space-between pt-2 border-top">
              <span
                v-if="!canGenerateBidIntervals && itemsCount > 0"
                class="text-caption text-warning"
              >
                Preencha todos os intervalos
              </span>
              <span v-else class="text-caption text-grey">Regramento de lances</span>

              <UiTooltip
                v-if="!canGenerateBidIntervals"
                :text="
                  itemsCount === 0
                    ? 'Adicione itens à demanda antes de gerar a tabela'
                    : `Cadastre o intervalo dos ${pendingBidIntervalsCount} produto(s) pendente(s)`
                "
              >
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps">
                    <UiButton
                      color="teal"
                      data-testid="btn-hub-open-bid-intervals"
                      disabled
                      prepend-icon="timer"
                      size="sm"
                      variant="outline"
                    >
                      Gerar Tabela
                    </UiButton>
                  </span>
                </template>
              </UiTooltip>

              <UiButton
                v-else
                color="teal"
                data-testid="btn-hub-open-bid-intervals"
                prepend-icon="copy"
                size="sm"
                variant="solid"
                @click="handleOpenBidIntervals"
              >
                Gerar Tabela
              </UiButton>
            </div>
          </UiCard>
        </UiCol>

        <!-- CARD 3: Saldo por Classe de Materiais -->
        <UiCol class="mb-3" cols="12" md="6">
          <UiCard class="h-100 d-flex flex-column pa-4 border" elevation="0">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center ga-2">
                <UiAvatar color="indigo" rounded size="36">
                  <UiIcon name="balance" size="20" />
                </UiAvatar>
                <div>
                  <div class="font-weight-bold text-subtitle-2">Saldo por Classe</div>
                  <div class="text-caption text-medium-emphasis">Controle de Teto Anual</div>
                </div>
              </div>
              <UiChip color="indigo" size="xs" variant="soft"> Orçamento </UiChip>
            </div>

            <div class="text-caption text-medium-emphasis flex-grow-1 mb-4">
              Demonstrativo de consumo acumulado no exercício, teto legal da dispensa e saldo
              restante por classe de materiais dos produtos desta contratação.
            </div>

            <div class="d-flex align-center justify-space-between pt-2 border-top">
              <span class="text-caption text-grey">Consumo anual</span>
              <UiButton
                color="indigo"
                data-testid="btn-hub-open-class-balance"
                :disabled="itemsCount === 0"
                prepend-icon="copy"
                size="sm"
                variant="solid"
                @click="handleOpenClassBalance"
              >
                Gerar Tabela
              </UiButton>
            </div>
          </UiCard>
        </UiCol>

        <!-- CARD 4: Tabela para Informação -->
        <UiCol class="mb-3" cols="12" md="6">
          <UiCard class="h-100 d-flex flex-column pa-4 border bg-grey-lighten-5" elevation="0">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center ga-2">
                <UiAvatar color="grey" rounded size="36">
                  <UiIcon name="recordsList" size="20" />
                </UiAvatar>
                <div>
                  <div class="font-weight-bold text-subtitle-2">Tabela para Informação</div>
                  <div class="text-caption text-medium-emphasis">Modelo Resumido</div>
                </div>
              </div>
              <UiChip color="default" size="xs" variant="soft"> Em breve </UiChip>
            </div>

            <div class="text-caption text-medium-emphasis flex-grow-1 mb-4">
              Modelo simplificado com relação resumida de itens para divulgação preliminar e
              comunicação com requisitantes.
            </div>

            <div class="d-flex align-center justify-space-between pt-2 border-top">
              <span class="text-caption text-grey">Divulgação preliminar</span>
              <UiButton
                color="grey"
                data-testid="btn-hub-open-info"
                size="sm"
                variant="outline"
                @click="handleOpenInfo"
              >
                Em Desenvolvimento
              </UiButton>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
    </div>

    <template #actions>
      <UiSpacer />
      <UiButton variant="ghost" @click="isModalOpen = false"> Fechar </UiButton>
    </template>
  </UiModal>
</template>
