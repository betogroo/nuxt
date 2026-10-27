<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import {
    generateTermsOfReferenceTableHtml,
    generateTermsOfReferenceTableText,
    type DemandTermsItem,
  } from '~/utils/demandTermsOfReferenceTable'

  const props = withDefaults(
    defineProps<{
      items?: DemandTermsItem[] | null
      demandTitle?: string | null
    }>(),
    {
      items: () => [],
      demandTitle: '',
    },
  )

  const isModalOpen = defineModel<boolean>({ default: false })

  const includeCharacteristics = ref(true)
  const includePrices = ref(true)
  const codeDisplay = ref<'both' | 'catmat' | 'catbec'>('both')

  const codeDisplayOptions = [
    { title: 'Ambos (CATMAT e BEC)', value: 'both' },
    { title: 'Apenas CATMAT', value: 'catmat' },
    { title: 'Apenas BEC', value: 'catbec' },
  ]

  const { copy, copyHtml } = useCopyToClipboard()

  const isCopied = ref(false)
  const isHtmlCopied = ref(false)

  const itemsList = computed<DemandTermsItem[]>(() => {
    return props.items || []
  })

  const generatedHtml = computed(() => {
    return generateTermsOfReferenceTableHtml(itemsList.value, {
      includeCharacteristics: includeCharacteristics.value,
      includePrices: includePrices.value,
      codeDisplay: codeDisplay.value,
    })
  })

  const generatedText = computed(() => {
    return generateTermsOfReferenceTableText(itemsList.value, {
      includeCharacteristics: includeCharacteristics.value,
      includePrices: includePrices.value,
      codeDisplay: codeDisplay.value,
    })
  })

  const handleCopyFormatted = async () => {
    if (!itemsList.value.length) return
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
    if (!itemsList.value.length) return
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
    max-width="980px"
    scrollable
    title="Tabela para Termo de Referência (Compras.gov.br)"
  >
    <div class="pa-4">
      <!-- Mensagem informativa sobre compatibilidade com Compras.gov.br -->
      <UiAlert class="mb-4" size="sm" type="info" variant="soft">
        <div class="text-caption">
          Esta tabela foi estruturada nas dimensões e estilos compatíveis com o editor do
          <strong>Compras.gov.br (CKEditor)</strong>. Clique em
          <strong>"Copiar Tabela Formatada"</strong> e utilize <strong>Ctrl + V</strong> no corpo do
          seu documento.
        </div>
      </UiAlert>

      <!-- Painel de Configurações da Tabela -->
      <UiCard class="mb-4" variant="outline">
        <div class="pa-3">
          <UiRow align="center" dense>
            <UiCol cols="12" md="4" sm="6">
              <UiSwitch
                v-model="includeCharacteristics"
                color="primary"
                hide-details
                label="Incluir Especificações / Características"
                size="sm"
              />
            </UiCol>
            <UiCol cols="12" md="4" sm="6">
              <UiSwitch
                v-model="includePrices"
                color="primary"
                hide-details
                label="Incluir Valores Estimados (R$)"
                size="sm"
              />
            </UiCol>
            <UiCol cols="12" md="4">
              <UiSelect
                v-model="codeDisplay"
                hide-details
                item-title="title"
                item-value="value"
                :items="codeDisplayOptions"
                label="Exibição de Código"
                size="sm"
                variant="outline"
              />
            </UiCol>
          </UiRow>
        </div>
      </UiCard>

      <!-- Pré-visualização da Tabela -->
      <div v-if="itemsList.length > 0">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-weight-bold text-medium-emphasis">
            PRÉ-VISUALIZAÇÃO DA TABELA ({{ itemsList.length }}
            {{ itemsList.length === 1 ? 'item' : 'itens' }}):
          </span>
          <span class="text-caption text-grey">Largura padrão: 672px</span>
        </div>

        <div
          class="border rounded pa-3 bg-white overflow-x-auto shadow-sm tr-preview-container"
          style="max-height: 480px; overflow-y: auto"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="tr-html-wrapper" v-html="generatedHtml" />
        </div>
      </div>

      <UiAlert v-else type="warning" variant="soft">
        Nenhum produto cadastrado nesta demanda ainda. Adicione itens antes de gerar a tabela para o
        Termo de Referência.
      </UiAlert>
    </div>

    <!-- Ações no rodapé do modal -->
    <template #actions>
      <UiButton variant="ghost" @click="isModalOpen = false"> Fechar </UiButton>
      <UiSpacer />
      <UiButton
        color="secondary"
        :disabled="!itemsList.length"
        prepend-icon="document"
        variant="outline"
        @click="handleCopyHtmlSource"
      >
        {{ isHtmlCopied ? 'HTML Copiado!' : 'Copiar Código HTML' }}
      </UiButton>
      <UiButton
        color="primary"
        :disabled="!itemsList.length"
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
  .tr-preview-container {
    border-color: #e2e8f0;
  }
  .tr-html-wrapper :deep(table) {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
</style>
