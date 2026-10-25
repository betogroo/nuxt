<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import {
    becCatalogUrlFormSchema,
    DEFAULT_BEC_CATALOG_URL,
    type BecCatalogUrlFormValues,
  } from '~/schemas/forms/system-settings'

  definePageMeta({
    icon: 'settings',
    middleware: ['admin'],
    layout: 'default',
    navLabel: 'Configurações Gerais',
    navSubtitle: 'URLs e parâmetros do sistema',
    navColor: 'primary',
    navGroup: 'admin',
    navSubgroup: 'system',
    navOrder: 15,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Configurações do Sistema' })

  const { fetchBecCatalogUrl, updateBecCatalogUrl, resetBecCatalogUrl } = useSystemSettings()
  const toast = useToast()

  const pending = ref(true)
  const isSaving = ref(false)
  const sampleBecCode = ref('6460526')

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(becCatalogUrlFormSchema, {
    bec_catalog_url: DEFAULT_BEC_CATALOG_URL,
  })

  const [urlInput, urlInputProps] = defineField('bec_catalog_url')

  onMounted(async () => {
    try {
      const current = await fetchBecCatalogUrl()
      resetForm({
        values: {
          bec_catalog_url: current || DEFAULT_BEC_CATALOG_URL,
        },
      })
    } catch {
      toast.error('Erro ao carregar configurações.')
    } finally {
      pending.value = false
    }
  })

  const previewUrl = computed(() => {
    const base = urlInput.value?.trim() || ''
    const code = sampleBecCode.value.trim()
    return base ? `${base}${code}` : ''
  })

  const onSave = handleSubmit(async (values: BecCatalogUrlFormValues) => {
    isSaving.value = true
    try {
      await updateBecCatalogUrl(values.bec_catalog_url)
      toast.success('Configuração salva com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração.')
    } finally {
      isSaving.value = false
    }
  })

  const onResetDefault = async () => {
    if (!(await toast.confirm('Deseja realmente restaurar a URL base padrão do catálogo BEC?'))) {
      return
    }

    isSaving.value = true
    try {
      await resetBecCatalogUrl()
      resetForm({
        values: {
          bec_catalog_url: DEFAULT_BEC_CATALOG_URL,
        },
      })
      toast.success('URL padrão restaurada com sucesso.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao restaurar URL padrão.')
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <div>
    <UiPageHeader
      back-to="/admin"
      subtitle="Parâmetros globais e URLs de integração do sistema"
      title="Configurações do Sistema"
    />

    <UiContainer>
      <div v-if="pending" class="d-flex justify-center my-16">
        <UiProgressCircular color="primary" indeterminate size="48" width="3" />
      </div>

      <UiCard v-else class="mx-auto" max-width="800" title="Catálogo BEC SP">
        <template #header>
          <UiIcon color="primary" name="settings" />
          <span class="ml-2 font-weight-medium">Catálogo BEC (Bolsa Eletrônica de Compras)</span>
        </template>

        <UiAlert class="mb-4" size="sm" type="info" variant="soft">
          Esta URL é a base utilizada para redirecionar os usuários para os detalhes dos produtos na
          BEC. O código <strong>CATBEC</strong> de cada item é anexado ao final desta URL.
        </UiAlert>

        <UiRow dense>
          <UiCol cols="12">
            <UiInput
              v-model="urlInput"
              v-bind="urlInputProps"
              :error-messages="errors.bec_catalog_url"
              hint="Ex: https://www.bec.sp.gov.br/BEC_Catalogo_ui/CatalogDetalheNovo.aspx?chave=&cod_id="
              label="URL Base do Catálogo BEC *"
              placeholder="https://..."
            />
          </UiCol>
        </UiRow>

        <!-- Seção de Pré-visualização e Teste -->
        <div class="mt-4 pa-4 rounded-lg bg-surface-variant border">
          <div class="text-caption font-weight-bold text-uppercase mb-2 text-medium-emphasis">
            Pré-visualização e Teste em Tempo Real
          </div>
          <div class="d-flex align-center flex-wrap ga-2 mb-2">
            <span class="text-caption">Código de Teste:</span>
            <input
              v-model="sampleBecCode"
              class="px-2 py-1 border rounded text-caption bg-surface text-high-emphasis"
              placeholder="Código CATBEC"
              style="width: 120px"
              type="text"
            />
          </div>
          <div v-if="previewUrl" class="text-caption text-truncate d-flex align-center ga-2 mt-2">
            <strong class="text-medium-emphasis">Link Final:</strong>
            <a
              class="text-primary text-decoration-none text-truncate font-weight-medium"
              :href="previewUrl"
              rel="noopener noreferrer"
              target="_blank"
              title="Testar link em nova aba"
            >
              {{ previewUrl }}
            </a>
            <UiActionButton
              action="view"
              color="primary"
              :href="previewUrl"
              icon="externalLink"
              size="xs"
              target="_blank"
              tooltip="Abrir link de teste em nova aba"
            />
          </div>
        </div>

        <template #actions>
          <UiButton
            :disabled="isSaving"
            prepend-icon="refresh"
            variant="ghost"
            @click="onResetDefault"
          >
            Restaurar Padrão
          </UiButton>
          <UiSpacer />
          <UiButton
            color="primary"
            :loading="isSaving"
            prepend-icon="save"
            variant="solid"
            @click="onSave"
          >
            Salvar Configuração
          </UiButton>
        </template>
      </UiCard>
    </UiContainer>
  </div>
</template>
