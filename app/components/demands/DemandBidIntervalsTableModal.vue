<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import {
    generateBidIntervalsTableHtml,
    generateBidIntervalsTableText,
    areAllBidIntervalsConfigured,
    getPendingBidIntervalItems,
    type DemandBidIntervalItem,
  } from '~/utils/demandBidIntervalsTable'

  const props = withDefaults(
    defineProps<{
      items?: DemandBidIntervalItem[] | null
      demandTitle?: string | null
    }>(),
    {
      items: () => [],
      demandTitle: '',
    },
  )

  const isModalOpen = defineModel<boolean>({ default: false })

  const { copy, copyHtml } = useCopyToClipboard()

  const isCopied = ref(false)
  const isHtmlCopied = ref(false)

  const itemsList = computed<DemandBidIntervalItem[]>(() => {
    return props.items || []
  })

  const pendingItems = computed(() => {
    return getPendingBidIntervalItems(itemsList.value)
  })

  const allConfigured = computed(() => {
    return areAllBidIntervalsConfigured(itemsList.value)
  })

  const generatedHtml = computed(() => {
    return generateBidIntervalsTableHtml(itemsList.value)
  })

  const generatedText = computed(() => {
    return generateBidIntervalsTableText(itemsList.value)
  })

  const handleCopyFormatted = async () => {
    if (!allConfigured.value) return
    const success = await copyHtml(
      generatedHtml.value,
      generatedText.value,
      'Tabela copiada com formatação! Pronta para colar no compras.gov.br.',
    )
    if (success) {
      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2500)
    }
  }

  const handleCopyHtmlSource = async () => {
    if (!allConfigured.value) return
    const success = await copy(
      generatedHtml.value,
      'Código-fonte HTML copiado para a área de transferência!',
    )
    if (success) {
      isHtmlCopied.value = true
      setTimeout(() => {
        isHtmlCopied.value = false
      }, 2500)
    }
  }
</script>

<template>
  <UiModal
    v-model="isModalOpen"
    max-width="920px"
    scrollable
    title="Tabela de Intervalos entre Lances (Compras.gov.br)"
  >
    <div class="pa-4">
      <!-- Mensagem informativa sobre compatibilidade com Compras.gov.br -->
      <UiAlert class="mb-4" size="sm" type="info" variant="soft">
        <div class="text-caption">
          Esta tabela apresenta os intervalos entre lances configurados para cada item da demanda e
          foi estruturada nas dimensões e estilos compatíveis com o editor do
          <strong>Compras.gov.br (CKEditor)</strong>. Clique em
          <strong>"Copiar Tabela Formatada"</strong> e utilize <strong>Ctrl + V</strong> no corpo do
          seu documento de aviso de contratação ou termo da disputa.
        </div>
      </UiAlert>

      <!-- Alerta quando não há itens cadastrados -->
      <UiAlert v-if="!itemsList.length" class="mb-4" type="warning" variant="soft">
        Nenhum produto cadastrado nesta demanda ainda. Adicione itens e defina os intervalos antes
        de gerar a tabela.
      </UiAlert>

      <!-- Alerta quando há itens sem intervalo configurado -->
      <UiAlert v-else-if="!allConfigured" class="mb-4" type="error" variant="soft">
        <div class="font-weight-bold mb-1">
          Intervalos pendentes ({{ pendingItems.length }} de {{ itemsList.length }} itens):
        </div>
        <div class="text-caption mb-2">
          Para garantir a integridade da disputa, o acesso à tabela formatada requer que todos os
          produtos tenham seus intervalos de lances cadastrados.
        </div>
        <ul class="text-caption pl-4 mb-0">
          <li v-for="item in pendingItems" :key="item.id">
            <strong>Item {{ item.sort_order || '-' }}:</strong>
            {{ item.product_name_snapshot || item.product?.name || 'Produto sem nome' }}
          </li>
        </ul>
      </UiAlert>

      <!-- Pré-visualização da Tabela quando todos os itens estão configurados -->
      <div v-else>
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-weight-bold text-medium-emphasis">
            PRÉ-VISUALIZAÇÃO DA TABELA ({{ itemsList.length }}
            {{ itemsList.length === 1 ? 'item' : 'itens' }}):
          </span>
          <span class="text-caption text-grey">Largura padrão: 672px</span>
        </div>

        <div
          class="border rounded pa-3 bg-white overflow-x-auto shadow-sm bid-interval-preview-container"
          style="max-height: 480px; overflow-y: auto"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="bid-interval-html-wrapper" v-html="generatedHtml" />
        </div>
      </div>
    </div>

    <!-- Ações no rodapé do modal -->
    <template #actions>
      <UiButton variant="ghost" @click="isModalOpen = false"> Fechar </UiButton>
      <UiSpacer />
      <UiButton
        color="secondary"
        :disabled="!allConfigured"
        prepend-icon="document"
        variant="outline"
        @click="handleCopyHtmlSource"
      >
        {{ isHtmlCopied ? 'HTML Copiado!' : 'Copiar Código HTML' }}
      </UiButton>
      <UiButton
        color="primary"
        :disabled="!allConfigured"
        :prepend-icon="isCopied ? 'check' : 'copy'"
        variant="solid"
        @click="handleCopyFormatted"
      >
        {{ isCopied ? 'Tabela Copiada!' : 'Copiar Tabela Formatada' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
  .bid-interval-preview-container {
    border-color: #e2e8f0;
  }
  .bid-interval-html-wrapper :deep(table) {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
</style>
