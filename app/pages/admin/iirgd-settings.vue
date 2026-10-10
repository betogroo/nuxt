<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useIirgdSettings, type IirgdSettings } from '~/composables/useIirgdSettings'

  definePageMeta({
    icon: 'settings',
    middleware: ['admin'],
    layout: 'default',
    navLabel: 'SLA IIRGD',
    navSubtitle: 'Prazos e prioridades',
    navColor: 'orange',
    navGroup: 'admin',
    navOrder: 95,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })
  useHead({ title: 'Configurações SLA IIRGD' })

  const { fetchSettings, updateSettings } = useIirgdSettings()
  const toast = useToast()

  const pending = ref(true)
  const isSaving = ref(false)
  const settingsId = ref<string>('')
  const alertDays = ref<number>(10)
  const delayDays = ref<number>(15)

  onMounted(async () => {
    try {
      const data = await fetchSettings()
      if (data) {
        settingsId.value = data.id
        alertDays.value = data.alert_days
        delayDays.value = data.delay_days
      }
    } catch (e: unknown) {
      toast.error('Erro ao carregar configurações.')
    } finally {
      pending.value = false
    }
  })

  const saveSettings = async () => {
    if (!settingsId.value) return
    isSaving.value = true
    try {
      await updateSettings(settingsId.value, {
        alert_days: Number(alertDays.value),
        delay_days: Number(delayDays.value),
      })
      toast.success('Configurações atualizadas com sucesso.')
    } catch (e: unknown) {
      toast.error('Erro ao salvar as configurações.')
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <div>
    <PageHeader
      back-to="/admin"
      subtitle="Definição de dias para prioridade e atraso das demandas"
      title="SLA IIRGD"
    />

    <UiContainer>
      <div v-if="pending" class="d-flex justify-center my-16">
        <UiProgressCircular color="primary" indeterminate size="48" width="3" />
      </div>

      <UiCard v-else class="mx-auto" max-width="600" title="Configurações de Prioridade">
        <template #header>
          <UiIcon color="primary" name="settings" />
          <span class="ml-2 font-weight-medium">Configurações de SLA (Tempo Limite)</span>
        </template>

        <UiRow dense>
          <UiCol cols="12" md="6">
            <UiInput
              v-model="alertDays"
              label="Dias para Alerta (Amarelo)"
              min="1"
              type="number"
            />
          </UiCol>
          <UiCol cols="12" md="6">
            <UiInput
              v-model="delayDays"
              label="Dias para Atraso (Vermelho)"
              min="1"
              type="number"
            />
          </UiCol>
        </UiRow>

        <div class="text-caption text-medium-emphasis mt-4">
          Demandas finalizadas (emitidas ou com erro) ignoram essa contagem.
        </div>

        <template #actions>
          <UiButton
            color="primary"
            :loading="isSaving"
            prepend-icon="save"
            @click="saveSettings"
          >
            Salvar
          </UiButton>
        </template>
      </UiCard>
    </UiContainer>
  </div>
</template>
