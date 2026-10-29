<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import {
    becCatalogUrlFormSchema,
    DEFAULT_BEC_CATALOG_URL,
    DEFAULT_CLASS_CEILING_2026,
    type BecCatalogUrlFormValues,
  } from '~/schemas/forms/system-settings'
  import { formatCurrency } from '~/utils/formatters'

  definePageMeta({
    icon: 'settings',
    middleware: ['admin'],
    layout: 'default',
    navLabel: 'Configurações Gerais',
    navSubtitle: 'Tetos anuais, URLs e parâmetros do sistema',
    navColor: 'primary',
    navGroup: 'admin',
    navSubgroup: 'system',
    navOrder: 15,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Configurações do Sistema' })

  const {
    fetchBecCatalogUrl,
    updateBecCatalogUrl,
    resetBecCatalogUrl,
    fetchProductClassAnnualCeilings,
    upsertProductClassAnnualCeiling,
    removeProductClassAnnualCeiling,
  } = useSystemSettings()
  const toast = useToast()

  const pending = ref(true)
  const isSaving = ref(false)
  const sampleBecCode = ref('6460526')

  // Annual Class Ceilings state
  const ceilingsMap = ref<Record<string, number>>({ '2026': DEFAULT_CLASS_CEILING_2026 })
  const ceilingYearInput = ref<string>('2026')
  const ceilingAmountInput = ref<string>(String(DEFAULT_CLASS_CEILING_2026))
  const isSavingCeiling = ref(false)

  const sortedCeilingEntries = computed(() => {
    return Object.entries(ceilingsMap.value)
      .map(([year, amount]) => ({
        year: Number(year),
        yearKey: year,
        amount: Number(amount),
      }))
      .sort((a, b) => b.year - a.year)
  })

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(becCatalogUrlFormSchema, {
    bec_catalog_url: DEFAULT_BEC_CATALOG_URL,
  })

  const [urlInput, urlInputProps] = defineField('bec_catalog_url')

  onMounted(async () => {
    try {
      const [currentUrl, loadedCeilings] = await Promise.all([
        fetchBecCatalogUrl(),
        fetchProductClassAnnualCeilings(),
      ])
      resetForm({
        values: {
          bec_catalog_url: currentUrl || DEFAULT_BEC_CATALOG_URL,
        },
      })
      ceilingsMap.value = { ...loadedCeilings }
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

  const onSaveAnnualCeiling = async () => {
    const parsedYear = Number(ceilingYearInput.value)
    const normalizedAmountStr = String(ceilingAmountInput.value).replace(',', '.').trim()
    const parsedAmount = Number(normalizedAmountStr)

    if (!Number.isInteger(parsedYear) || parsedYear < 1990 || parsedYear > 2100) {
      toast.error('Informe um ano válido entre 1990 e 2100 (ex: 2025, 2026).')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor numérico positivo para o teto da classe.')
      return
    }

    isSavingCeiling.value = true
    try {
      const updated = await upsertProductClassAnnualCeiling(parsedYear, parsedAmount)
      ceilingsMap.value = { ...updated }
      toast.success(
        `Teto anual para ${parsedYear} salvo em ${formatCurrency(parsedAmount)} com sucesso!`,
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar teto anual.')
    } finally {
      isSavingCeiling.value = false
    }
  }

  const selectYearToEdit = (entry: { year: number; amount: number }) => {
    ceilingYearInput.value = String(entry.year)
    ceilingAmountInput.value = String(entry.amount)
  }

  const onRestore2026Default = async () => {
    isSavingCeiling.value = true
    try {
      const updated = await upsertProductClassAnnualCeiling(2026, DEFAULT_CLASS_CEILING_2026)
      ceilingsMap.value = { ...updated }
      if (ceilingYearInput.value === '2026') {
        ceilingAmountInput.value = String(DEFAULT_CLASS_CEILING_2026)
      }
      toast.success('Teto de 2026 restaurado para R$ 65.492,11.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao restaurar teto de 2026.')
    } finally {
      isSavingCeiling.value = false
    }
  }

  const onRemoveCeilingYear = async (year: number) => {
    if (
      !(await toast.confirm(
        `Deseja remover a configuração de teto anual para o exercício de ${year}?`,
      ))
    ) {
      return
    }

    isSavingCeiling.value = true
    try {
      const updated = await removeProductClassAnnualCeiling(year)
      ceilingsMap.value = { ...updated }
      toast.success(`Configuração do ano ${year} removida.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover configuração do ano.')
    } finally {
      isSavingCeiling.value = false
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

      <div v-else class="d-flex flex-column ga-6 mx-auto" style="max-width: 800px">
        <UiCard title="Teto Anual por Classe de Produtos">
          <template #header>
            <UiIcon color="primary" name="finances" />
            <span class="ml-2 font-weight-medium">
              Teto Anual por Classe de Produtos (Licitações / Dispensa)
            </span>
            <UiSpacer />
            <UiButton
              color="primary"
              prepend-icon="chart"
              size="sm"
              to="/demands/class-spending"
              variant="soft"
            >
              Ver Relatório de Gastos
            </UiButton>
          </template>

          <UiAlert class="mb-4" size="sm" type="info" variant="soft">
            Defina o limite anual (teto de dispensa/gasto por classe de produtos) para cada
            exercício. Para o ano de <strong>2026</strong>, o valor padrão de referência é
            <strong>R$ 65.492,11</strong>. Você também pode cadastrar tetos para
            <strong>anos anteriores</strong> (ex: 2025, 2024) para apurar demandas já encerradas
            importadas de outros sistemas.
          </UiAlert>

          <UiRow align="center" dense>
            <UiCol cols="12" sm="4">
              <UiInput
                v-model="ceilingYearInput"
                hint="Ex: 2026, 2025, 2024"
                label="Ano do Exercício *"
                max="2100"
                min="1990"
                placeholder="2026"
                type="number"
              />
            </UiCol>
            <UiCol cols="12" sm="5">
              <UiInput
                v-model="ceilingAmountInput"
                hint="Ex: 65492.11"
                label="Valor do Teto por Classe (R$) *"
                min="0.01"
                placeholder="65492.11"
                step="0.01"
                type="number"
              />
            </UiCol>
            <UiCol class="d-flex align-start pt-1" cols="12" sm="3">
              <UiButton
                block
                color="primary"
                :loading="isSavingCeiling"
                prepend-icon="save"
                variant="solid"
                @click="onSaveAnnualCeiling"
              >
                Salvar Ano
              </UiButton>
            </UiCol>
          </UiRow>

          <div class="mt-4">
            <div class="text-caption font-weight-bold text-uppercase mb-2 text-medium-emphasis">
              Tetos Cadastrados por Exercício
            </div>
            <UiTable
              density="compact"
              :headers="[
                { text: 'Ano (Exercício)', value: 'year' },
                { text: 'Teto por Classe', value: 'amount', align: 'right' },
                { text: 'Ações', value: 'actions', align: 'right' },
              ]"
              :items="sortedCeilingEntries"
            >
              <template #item-year="{ item }">
                <div class="d-flex align-center ga-2">
                  <UiChip
                    :color="item.year === 2026 ? 'primary' : 'info'"
                    label
                    size="sm"
                    variant="soft"
                  >
                    {{ item.year }}
                  </UiChip>
                  <span v-if="item.year === 2026" class="text-caption text-medium-emphasis">
                    (Exercício Base)
                  </span>
                </div>
              </template>

              <template #item-amount="{ item }">
                <span class="font-weight-bold text-high-emphasis">
                  {{ formatCurrency(item.amount) }}
                </span>
              </template>

              <template #item-actions="{ item }">
                <div class="d-flex justify-end ga-1">
                  <UiActionButton
                    action="edit"
                    tooltip="Carregar ano para edição"
                    @click="selectYearToEdit(item)"
                  />
                  <UiButton
                    v-if="item.year === 2026 && item.amount !== DEFAULT_CLASS_CEILING_2026"
                    color="warning"
                    :loading="isSavingCeiling"
                    prepend-icon="refresh"
                    size="xs"
                    variant="ghost"
                    @click="onRestore2026Default"
                  >
                    Padrão 2026
                  </UiButton>
                  <UiActionButton
                    v-if="item.year !== 2026"
                    action="delete"
                    :disabled="isSavingCeiling"
                    tooltip="Remover teto deste ano"
                    @click="onRemoveCeilingYear(item.year)"
                  />
                </div>
              </template>
            </UiTable>
          </div>
        </UiCard>

        <UiCard title="Catálogo BEC SP">
          <template #header>
            <UiIcon color="primary" name="settings" />
            <span class="ml-2 font-weight-medium">Catálogo BEC (Bolsa Eletrônica de Compras)</span>
          </template>

          <UiAlert class="mb-4" size="sm" type="info" variant="soft">
            Esta URL é a base utilizada para redirecionar os usuários para os detalhes dos produtos
            na BEC. O código <strong>CATBEC</strong> de cada item é anexado ao final desta URL.
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
      </div>
    </UiContainer>
  </div>
</template>
