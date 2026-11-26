<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { DemandRow } from '~/composables/useDemands'
  import { useSuppliers, type SupplierRow } from '~/composables/useSuppliers'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import { useToast } from '~/composables/useToast'
  import {
    calculateTechnicalCertificateTotals,
    generateTechnicalCapacityCertificateHtml,
    generateTechnicalCapacityCertificateText,
    type TechnicalCertificateItem,
    type TechnicalCertificateOptions,
    type TechnicalCertificateSupplier,
  } from '~/utils/technicalCapacityCertificate'
  import { printHtmlViaIframe } from '~/utils/reportHtml'

  const props = withDefaults(
    defineProps<{
      modelValue: boolean
      initialSupplier?: (TechnicalCertificateSupplier & { id?: string }) | SupplierRow | null
      demand?: DemandRow | null
      availableSuppliers?: Array<{ id: string; company_name: string; cnpj: string }>
    }>(),
    {
      initialSupplier: null,
      demand: null,
      availableSuppliers: () => [],
    },
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
  }>()

  const toast = useToast()
  const { copy } = useCopyToClipboard()
  const { fetchSupplierWonProductsDetailed, fetchSupplierById } = useSuppliers()

  const activeTab = ref<'items' | 'preview' | 'text' | 'settings'>('items')
  const isLoadingItems = ref(false)
  const wonItems = ref<TechnicalCertificateItem[]>([])
  const selectedItemIds = ref<string[]>([])
  const selectedSupplierId = ref<string>('')
  const currentSupplier = ref<TechnicalCertificateSupplier | null>(null)

  // Options configuration
  const issuerOrganization = ref('Delegacia Seccional de Polícia de São Joaquim da Barra')
  const issuerUge = ref('180297')
  const issuerCity = ref('São Joaquim da Barra')
  const issuerState = ref('SP')
  const signatoryName = ref('')
  const signatoryRole = ref('Delegado de Polícia Seccional / Ordenador de Despesas')
  const customNotes = ref('')
  const searchQuery = ref('')
  const selectedDemandFilter = ref<string>('all')

  // Supplier options for selector dropdown
  const supplierSelectOptions = computed(() => {
    return props.availableSuppliers.map((s) => ({
      value: s.id,
      title: `${s.company_name} (${s.cnpj})`,
    }))
  })

  async function loadSupplierProducts(supplierId: string) {
    isLoadingItems.value = true
    try {
      const items = await fetchSupplierWonProductsDetailed(supplierId)
      wonItems.value = items

      // Pre-select: if current demand exists and has items, select those; otherwise select all
      if (props.demand?.id) {
        const demandItemIds = items.filter((i) => i.demand_id === props.demand?.id).map((i) => i.id)

        if (demandItemIds.length > 0) {
          selectedItemIds.value = demandItemIds
          selectedDemandFilter.value = props.demand.id
        } else {
          selectedItemIds.value = items.map((i) => i.id)
          selectedDemandFilter.value = 'all'
        }
      } else {
        selectedItemIds.value = items.map((i) => i.id)
        selectedDemandFilter.value = 'all'
      }
    } catch (err: unknown) {
      console.error('Erro ao buscar itens vencedores do fornecedor:', err)
      toast.error('Erro ao carregar os itens vencedores do fornecedor.')
    } finally {
      isLoadingItems.value = false
    }
  }

  // Watch for opening or initialSupplier prop change
  watch(
    () => [props.modelValue, props.initialSupplier],
    async ([isOpen]) => {
      if (!isOpen) return

      if (props.initialSupplier && props.initialSupplier.id) {
        selectedSupplierId.value = props.initialSupplier.id
        const supp = props.initialSupplier as Record<string, unknown>
        currentSupplier.value = {
          id: props.initialSupplier.id,
          company_name: props.initialSupplier.company_name,
          cnpj: props.initialSupplier.cnpj,
          address: typeof supp.address === 'string' ? supp.address : null,
          responsible_name:
            typeof supp.responsible_name === 'string' ? supp.responsible_name : null,
          email: typeof supp.email === 'string' ? supp.email : null,
        }
      } else if (props.availableSuppliers.length > 0 && !selectedSupplierId.value) {
        selectedSupplierId.value = props.availableSuppliers[0].id
      }

      if (selectedSupplierId.value) {
        await loadSupplierProducts(selectedSupplierId.value)
      }
    },
    { immediate: true },
  )

  // Watch supplier selection change
  watch(selectedSupplierId, async (newId) => {
    if (newId && props.modelValue) {
      if (!currentSupplier.value || currentSupplier.value.id !== newId) {
        const found = props.availableSuppliers.find((s) => s.id === newId)
        if (found) {
          currentSupplier.value = {
            id: found.id,
            company_name: found.company_name,
            cnpj: found.cnpj,
          }
        } else {
          try {
            const fetched = await fetchSupplierById(newId)
            currentSupplier.value = fetched
          } catch (err) {
            console.error('Erro ao buscar detalhes do fornecedor:', err)
          }
        }
      }
      await loadSupplierProducts(newId)
    }
  })

  // Unique demands represented in the won items list
  const uniqueDemands = computed(() => {
    const map = new Map<string, string>()
    for (const item of wonItems.value) {
      if (item.demand_id) {
        map.set(item.demand_id, item.demand_name || 'Demanda sem título')
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({
      value: id,
      title,
    }))
  })

  const demandFilterOptions = computed(() => [
    { value: 'all', title: 'Todas as Demandas' },
    ...uniqueDemands.value,
  ])

  // Filtered items shown in the checklist table
  const filteredItems = computed(() => {
    return wonItems.value.filter((item) => {
      const matchesDemand =
        selectedDemandFilter.value === 'all' || item.demand_id === selectedDemandFilter.value
      const query = searchQuery.value.trim().toLowerCase()
      const matchesSearch =
        !query ||
        item.product_name.toLowerCase().includes(query) ||
        (item.demand_name && item.demand_name.toLowerCase().includes(query)) ||
        (item.process_number && item.process_number.toLowerCase().includes(query)) ||
        (item.contract_number && item.contract_number.toLowerCase().includes(query))

      return matchesDemand && matchesSearch
    })
  })

  // Selected items objects for certificate generation
  const certificateItems = computed(() => {
    const selectedSet = new Set(selectedItemIds.value)
    return wonItems.value.filter((i) => selectedSet.has(i.id))
  })

  const totals = computed(() => {
    return calculateTechnicalCertificateTotals(certificateItems.value)
  })

  const certificateOptions = computed<TechnicalCertificateOptions>(() => ({
    issuerOrganization: issuerOrganization.value,
    issuerUge: issuerUge.value,
    issuerCity: issuerCity.value,
    issuerState: issuerState.value,
    signatoryName: signatoryName.value,
    signatoryRole: signatoryRole.value,
    customNotes: customNotes.value || null,
  }))

  const certificateHtml = computed(() => {
    if (!currentSupplier.value || certificateItems.value.length === 0) return ''
    return generateTechnicalCapacityCertificateHtml(
      currentSupplier.value,
      certificateItems.value,
      certificateOptions.value,
    )
  })

  const certificateText = computed(() => {
    if (!currentSupplier.value || certificateItems.value.length === 0) return ''
    return generateTechnicalCapacityCertificateText(
      currentSupplier.value,
      certificateItems.value,
      certificateOptions.value,
    )
  })

  const isAllFilteredSelected = computed(() => {
    if (filteredItems.value.length === 0) return false
    return filteredItems.value.every((item) => selectedItemIds.value.includes(item.id))
  })

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredItems.value.map((i) => i.id)
    if (isAllFilteredSelected.value) {
      selectedItemIds.value = selectedItemIds.value.filter((id) => !filteredIds.includes(id))
    } else {
      const merged = new Set([...selectedItemIds.value, ...filteredIds])
      selectedItemIds.value = Array.from(merged)
    }
  }

  const toggleItemSelection = (id: string) => {
    if (selectedItemIds.value.includes(id)) {
      selectedItemIds.value = selectedItemIds.value.filter((item) => item !== id)
    } else {
      selectedItemIds.value.push(id)
    }
  }

  const handleCopyText = async () => {
    if (!certificateText.value) return
    const success = await copy(certificateText.value, 'Atestado copiado com sucesso!')
    if (success) {
      toast.success('Atestado de Capacidade Técnica copiado para a área de transferência!')
    }
  }

  const handlePrint = () => {
    if (!certificateHtml.value) return
    printHtmlViaIframe(certificateHtml.value)
  }

  const closeModal = () => {
    emit('update:modelValue', false)
  }
</script>

<template>
  <UiModal
    max-width="960px"
    :model-value="modelValue"
    title="Atestado de Capacidade Técnica"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- Top Supplier Header / Selector -->
    <div class="mb-4">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
        <div class="d-flex align-center ga-2">
          <UiIcon color="primary" name="certificate" size="md" />
          <div>
            <div class="text-subtitle-1 font-weight-bold text-primary">
              {{ currentSupplier?.company_name || 'Selecione o Fornecedor' }}
            </div>
            <div class="text-caption text-grey">
              CNPJ: {{ currentSupplier?.cnpj || '-' }}
              <template v-if="currentSupplier?.address">
                &bull; {{ currentSupplier.address }}
              </template>
            </div>
          </div>
        </div>

        <!-- Supplier Switcher if multiple available -->
        <div v-if="availableSuppliers.length > 1" style="min-width: 260px">
          <UiSelect
            v-model="selectedSupplierId"
            density="compact"
            hide-details
            :items="supplierSelectOptions"
            label="Trocar Fornecedor"
          />
        </div>
      </div>

      <!-- Totals & Summary Bar -->
      <UiCard
        class="pa-3 bg-surface-variant d-flex align-center justify-space-between flex-wrap ga-3"
      >
        <div class="d-flex align-center ga-3 flex-wrap">
          <div>
            <span class="text-caption text-grey">Itens Selecionados:</span>
            <div class="font-weight-bold text-body-1">
              {{ certificateItems.length }} de {{ wonItems.length }}
            </div>
          </div>
          <div>
            <span class="text-caption text-grey">Quantidade Total:</span>
            <div class="font-weight-bold text-body-1">
              {{ totals.totalQuantity }}
            </div>
          </div>
          <div>
            <span class="text-caption text-grey">Valor Total Atestado:</span>
            <div class="font-weight-bold text-success text-body-1">
              {{ totals.formattedTotalAmount }}
            </div>
          </div>
        </div>

        <div class="text-caption text-grey-darken-1 fst-italic" style="max-width: 380px">
          ({{ totals.totalAmountInWords }})
        </div>
      </UiCard>
    </div>

    <!-- View Mode Navigation Tabs -->
    <div class="d-flex align-center ga-2 mb-3 border-b pb-2">
      <UiButton
        data-testid="tab-items"
        prepend-icon="formatListBulleted"
        size="sm"
        :variant="activeTab === 'items' ? 'solid' : 'ghost'"
        @click="activeTab = 'items'"
      >
        Itens Vencedores ({{ certificateItems.length }})
      </UiButton>
      <UiButton
        data-testid="tab-preview"
        prepend-icon="eye"
        size="sm"
        :variant="activeTab === 'preview' ? 'solid' : 'ghost'"
        @click="activeTab = 'preview'"
      >
        Visualização A4
      </UiButton>
      <UiButton
        data-testid="tab-text"
        prepend-icon="document"
        size="sm"
        :variant="activeTab === 'text' ? 'solid' : 'ghost'"
        @click="activeTab = 'text'"
      >
        Texto Formatado
      </UiButton>
      <UiButton
        data-testid="tab-settings"
        prepend-icon="settings"
        size="sm"
        :variant="activeTab === 'settings' ? 'solid' : 'ghost'"
        @click="activeTab = 'settings'"
      >
        Configurações
      </UiButton>
    </div>

    <!-- TAB 1: ITENS VENCEDORES CHECKLIST -->
    <div v-if="activeTab === 'items'">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <!-- Demand Filter -->
        <div v-if="uniqueDemands.length > 1" style="min-width: 220px">
          <UiSelect
            v-model="selectedDemandFilter"
            density="compact"
            hide-details
            :items="demandFilterOptions"
            label="Filtrar por Demanda"
          />
        </div>

        <!-- Search Bar -->
        <div style="min-width: 240px; flex-grow: 1">
          <UiTextField
            v-model="searchQuery"
            clearable
            density="compact"
            hide-details
            label="Buscar produto ou processo..."
            prepend-inner-icon="magnify"
          />
        </div>

        <UiButton
          data-testid="btn-toggle-all"
          size="xs"
          variant="outline"
          @click="toggleSelectAllFiltered"
        >
          {{ isAllFilteredSelected ? 'Desmarcar Todos' : 'Selecionar Todos' }}
        </UiButton>
      </div>

      <UiAlert v-if="wonItems.length === 0 && !isLoadingItems" class="mb-3" type="info">
        Nenhum item vencedor homologado foi encontrado para este fornecedor nas demandas do sistema.
      </UiAlert>

      <UiTable
        v-else
        class="border rounded"
        density="compact"
        :headers="[
          { text: '', value: 'select', width: '45px' },
          { text: 'Produto / Descrição', value: 'product_name' },
          { text: 'Demanda de Origem', value: 'demand_name' },
          { text: 'Unid.', value: 'unit_name', align: 'center', width: '60px' },
          { text: 'Qtd.', value: 'quantity', align: 'right', width: '70px' },
          { text: 'Unitário', value: 'unit_price', align: 'right', width: '100px' },
          { text: 'Total', value: 'total_price', align: 'right', width: '110px' },
        ]"
        :items="filteredItems"
        :loading="isLoadingItems"
      >
        <template #item-select="{ item }">
          <UiCheckbox
            :data-testid="`checkbox-item-${item.id}`"
            density="compact"
            hide-details
            :model-value="selectedItemIds.includes(item.id)"
            @update:model-value="toggleItemSelection(item.id)"
          />
        </template>

        <template #item-product_name="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.product_name }}</div>
            <div v-if="item.contract_number" class="text-caption text-grey">
              Contrato: {{ item.contract_number }}
            </div>
          </div>
        </template>

        <template #item-demand_name="{ item }">
          <div class="text-caption">
            <div>{{ item.demand_name || '-' }}</div>
            <div v-if="item.process_number" class="text-grey">SEI: {{ item.process_number }}</div>
          </div>
        </template>

        <template #item-unit_price="{ item }">
          <span
            >R$
            {{
              Number(item.unit_price || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }}</span
          >
        </template>

        <template #item-total_price="{ item }">
          <span class="font-weight-bold text-success">
            R$
            {{
              Number(item.total_price || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }}
          </span>
        </template>
      </UiTable>
    </div>

    <!-- TAB 2: VISUALIZAÇÃO A4 -->
    <!-- eslint-disable vue/no-v-html -->
    <div v-else-if="activeTab === 'preview'">
      <UiAlert v-if="certificateItems.length === 0" class="mb-3" type="warning">
        Selecione ao menos um produto na aba "Itens Vencedores" para visualizar o atestado.
      </UiAlert>
      <div
        v-else
        class="border rounded pa-4 bg-white shadow-sm overflow-y-auto"
        style="max-height: 520px"
        v-html="certificateHtml"
      />
    </div>
    <!-- eslint-enable vue/no-v-html -->

    <!-- TAB 3: TEXTO FORMATADO -->
    <div v-else-if="activeTab === 'text'">
      <UiAlert v-if="certificateItems.length === 0" class="mb-3" type="warning">
        Selecione ao menos um produto na aba "Itens Vencedores" para gerar o texto formatado.
      </UiAlert>
      <div v-else>
        <UiTextarea
          auto-grow
          class="font-mono text-body-2"
          :model-value="certificateText"
          readonly
          rows="14"
        />
      </div>
    </div>

    <!-- TAB 4: CONFIGURAÇÕES -->
    <div v-else-if="activeTab === 'settings'">
      <div class="d-flex flex-column ga-3">
        <UiTextField v-model="issuerOrganization" label="Órgão Emissor" />
        <div class="d-flex ga-3">
          <UiTextField v-model="issuerUge" label="Código UGE" style="max-width: 160px" />
          <UiTextField v-model="issuerCity" label="Cidade" />
          <UiTextField v-model="issuerState" label="UF" style="max-width: 100px" />
        </div>
        <div class="d-flex ga-3">
          <UiTextField v-model="signatoryName" label="Nome da Autoridade Signatária (Opcional)" />
          <UiTextField v-model="signatoryRole" label="Cargo da Autoridade" />
        </div>
        <UiTextarea
          v-model="customNotes"
          label="Observações Adicionais (Constam no Atestado)"
          placeholder="Ex: Entregas realizadas em conformidade técnica rigorosa e nos prazos avençados."
          rows="3"
        />
      </div>
    </div>

    <!-- Modal Actions -->
    <template #actions>
      <UiButton variant="ghost" @click="closeModal">Fechar</UiButton>
      <UiButton
        data-testid="btn-copy-certificate"
        :disabled="certificateItems.length === 0"
        prepend-icon="copy"
        variant="outline"
        @click="handleCopyText"
      >
        Copiar Texto
      </UiButton>
      <UiButton
        color="primary"
        data-testid="btn-print-certificate"
        :disabled="certificateItems.length === 0"
        prepend-icon="printer"
        @click="handlePrint"
      >
        Imprimir Atestado
      </UiButton>
    </template>
  </UiModal>
</template>
