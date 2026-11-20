<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useSchoolIncidents } from '~/composables/useSchoolIncidents'
  import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'
  import { SCHOOL_INCIDENT_TERMS_TEXT } from '~/constants/school-incidents'
  import type { IncidentParticipantInput } from '~/types/school'

  const emit = defineEmits<{
    (e: 'saved'): void
  }>()
  const modelValue = defineModel<boolean>({ default: false })
  const toast = useToast()
  const { createIncident, isSaving } = useSchoolIncidents()

  const title = ref('')
  const description = ref('')
  const termsAccepted = ref(false)

  const offenders = ref<IncidentParticipantInput[]>([{ name: '', classroom: '' }])
  const victims = ref<IncidentParticipantInput[]>([])

  const textareaComponentRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)

  const getNativeTextarea = (): HTMLTextAreaElement | null => {
    if (!textareaComponentRef.value) return null
    if (textareaComponentRef.value instanceof HTMLTextAreaElement) {
      return textareaComponentRef.value
    }
    const el =
      (textareaComponentRef.value as { $el?: HTMLElement }).$el ||
      (textareaComponentRef.value as HTMLElement)
    return el?.querySelector?.('textarea') || null
  }

  const {
    isOpen: isMentionMenuOpen,
    triggerType: mentionTriggerType,
    triggerChar: mentionTriggerChar,
    query: mentionQuery,
    activeIndex: mentionActiveIndex,
    availableParticipants: mentionAvailableParticipants,
    filteredOptions: mentionFilteredOptions,
    handleInput: onDescriptionInput,
    handleKeydown: onDescriptionKeydown,
    selectOption: onSelectMentionOption,
    close: closeMentionMenu,
  } = useMentionAutocomplete({
    text: description,
    offenders,
    victims,
  })

  const onKeydownTextarea = (e: KeyboardEvent) => {
    onDescriptionKeydown(e, getNativeTextarea())
  }

  const onInputTextarea = (e: Event) => {
    onDescriptionInput(e)
  }

  const onSelectOptionClick = (option: IncidentParticipantInput) => {
    onSelectMentionOption(option, getNativeTextarea())
  }

  const resetForm = () => {
    title.value = ''
    description.value = ''
    termsAccepted.value = false
    offenders.value = [{ name: '', classroom: '' }]
    victims.value = []
    closeMentionMenu()
  }

  watch(modelValue, (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  })

  const addOffender = () => {
    offenders.value.push({ name: '', classroom: '' })
  }

  const removeOffender = (index: number) => {
    if (offenders.value.length > 1) {
      offenders.value.splice(index, 1)
    }
  }

  const addVictim = () => {
    victims.value.push({ name: '', classroom: '' })
  }

  const removeVictim = (index: number) => {
    victims.value.splice(index, 1)
  }

  const namedOffenders = computed(() => offenders.value.filter((o) => o.name && o.name.trim()))
  const namedVictims = computed(() => victims.value.filter((v) => v.name && v.name.trim()))

  const insertMention = (tag: string) => {
    if (!description.value) {
      description.value = tag + ' '
    } else {
      const endsWithSpace = description.value.endsWith(' ')
      description.value += (endsWithSpace ? '' : ' ') + tag + ' '
    }
  }

  const isValid = computed(() => {
    const hasTitle = Boolean(title.value.trim())
    const hasDescription = Boolean(description.value.trim())
    const hasAtLeastOneOffender = offenders.value.some((o) => o.name && o.name.trim() !== '')
    return hasTitle && hasDescription && hasAtLeastOneOffender && termsAccepted.value
  })

  const handleSubmit = async () => {
    if (!isValid.value) return

    try {
      await createIncident({
        title: title.value.trim(),
        description: description.value.trim(),
        terms_accepted: termsAccepted.value,
        offenders: offenders.value,
        victims: victims.value,
      })

      toast.success('Ocorrência registrada com sucesso!')
      emit('saved')
      modelValue.value = false
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar ocorrência.'
      toast.error(msg)
    }
  }
</script>

<template>
  <UiModal v-model="modelValue" max-width="840px" persistent title="Registrar Nova Ocorrência">
    <div class="pa-4 d-flex flex-column gap-6">
      <!-- 1. Título da Ocorrência -->
      <div>
        <UiTextField
          v-model="title"
          autofocus
          hide-details="auto"
          label="Título da Ocorrência *"
          placeholder="Ex: Conflito verbal durante o intervalo no pátio"
          variant="outline"
        />
      </div>

      <!-- 2. Seção de Ofensores -->
      <UiCard border class="pa-4 bg-surface" elevation="0" rounded="lg">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <UiIcon color="warning" name="alert" size="20" />
            <h3 class="text-subtitle-1 font-weight-bold">
              Ofensores
              <span class="text-error font-weight-regular text-caption">* (mínimo 1)</span>
            </h3>
          </div>
          <UiButton prepend-icon="add" size="sm" variant="outline" @click="addOffender">
            Adicionar Ofensor
          </UiButton>
        </div>

        <div
          v-for="(offender, index) in offenders"
          :key="`offender-${index}`"
          class="d-flex align-center gap-3 mb-3"
        >
          <div class="flex-grow-1">
            <UiTextField
              v-model="offender.name"
              density="compact"
              hide-details="auto"
              :label="`Nome do Ofensor ${index + 1} *`"
              placeholder="Nome completo do aluno"
              variant="outline"
            />
          </div>
          <div style="width: 220px">
            <UiTextField
              v-model="offender.classroom"
              density="compact"
              hide-details="auto"
              label="Sala / Turma"
              placeholder="Ex: 3º Ano B"
              variant="outline"
            />
          </div>
          <UiButton
            :disabled="offenders.length <= 1"
            icon="delete"
            size="sm"
            variant="ghost"
            @click="removeOffender(index)"
          />
        </div>
      </UiCard>

      <!-- 3. Seção de Vítimas -->
      <UiCard border class="pa-4 bg-surface" elevation="0" rounded="lg">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <UiIcon color="info" name="shieldUser" size="20" />
            <h3 class="text-subtitle-1 font-weight-bold">
              Vítimas
              <span class="text-medium-emphasis font-weight-regular text-caption">(opcional)</span>
            </h3>
          </div>
          <UiButton prepend-icon="add" size="sm" variant="outline" @click="addVictim">
            Adicionar Vítima
          </UiButton>
        </div>

        <div v-if="victims.length === 0" class="text-body-2 text-medium-emphasis py-2">
          Nenhuma vítima adicionada para esta ocorrência. Clique em "Adicionar Vítima" caso haja
          envolvidos.
        </div>

        <div
          v-for="(victim, index) in victims"
          :key="`victim-${index}`"
          class="d-flex align-center gap-3 mb-3"
        >
          <div class="flex-grow-1">
            <UiTextField
              v-model="victim.name"
              density="compact"
              hide-details="auto"
              :label="`Nome da Vítima ${index + 1}`"
              placeholder="Nome completo do aluno"
              variant="outline"
            />
          </div>
          <div style="width: 220px">
            <UiTextField
              v-model="victim.classroom"
              density="compact"
              hide-details="auto"
              label="Sala / Turma"
              placeholder="Ex: 4º Ano A"
              variant="outline"
            />
          </div>
          <UiButton icon="delete" size="sm" variant="ghost" @click="removeVictim(index)" />
        </div>
      </UiCard>

      <!-- 4. Relato / Histórico do Fato -->
      <div>
        <div class="d-flex align-center justify-space-between mb-2">
          <label class="text-subtitle-2 font-weight-bold"> Histórico / Relato do Ocorrido * </label>
        </div>

        <UiAlert class="mb-3" color="info" icon="info" variant="soft">
          Para garantir a proteção de dados escolares, cite os envolvidos utilizando
          <strong>@</strong> para ofensores e <strong>/</strong> para vítimas. Você também pode
          clicar nos botões de atalho abaixo para inserir as tags diretamente no texto:
        </UiAlert>

        <!-- Chips de Inserção Rápida -->
        <div
          v-if="namedOffenders.length > 0 || namedVictims.length > 0"
          class="d-flex flex-wrap align-center gap-2 mb-2 pa-2 rounded-lg bg-surface-variant"
        >
          <span class="text-caption font-weight-bold text-medium-emphasis mr-1"
            >Inserir menção:</span
          >

          <UiChip
            v-for="off in namedOffenders"
            :key="`chip-off-${off.name}`"
            class="cursor-pointer"
            color="warning"
            size="sm"
            variant="solid"
            @click="insertMention(`@${off.name.trim()}`)"
          >
            <UiIcon class="mr-1" name="alert" size="14" />
            @{{ off.name.trim() }}
            <span v-if="off.classroom" class="ml-1 opacity-80">({{ off.classroom }})</span>
          </UiChip>

          <UiChip
            v-for="vic in namedVictims"
            :key="`chip-vic-${vic.name}`"
            class="cursor-pointer"
            color="info"
            size="sm"
            variant="solid"
            @click="insertMention(`/${vic.name.trim()}`)"
          >
            <UiIcon class="mr-1" name="shieldUser" size="14" />
            /{{ vic.name.trim() }}
            <span v-if="vic.classroom" class="ml-1 opacity-80">({{ vic.classroom }})</span>
          </UiChip>
        </div>

        <div class="position-relative">
          <UiTextarea
            ref="textareaComponentRef"
            v-model="description"
            hide-details="auto"
            placeholder="Descreva o ocorrido detalhadamente. Exemplo: Durante o intervalo, @Nome abordou /Nome próximo à cantina..."
            :rows="6"
            variant="outline"
            @click="onInputTextarea"
            @input="onInputTextarea"
            @keydown="onKeydownTextarea"
            @keyup="onInputTextarea"
          />

          <!-- Menu Flutuante de Menções (@ e /) -->
          <UiCard
            v-if="isMentionMenuOpen"
            border
            class="position-absolute elevation-6 rounded-lg bg-surface mention-menu-card"
            elevation="6"
            rounded="lg"
            style="
              top: 100%;
              left: 0;
              right: 0;
              z-index: 50;
              margin-top: 4px;
              max-height: 280px;
              overflow-y: auto;
            "
          >
            <!-- Cabeçalho do Menu de Menções -->
            <div
              class="pa-2 px-3 d-flex align-center justify-space-between border-b"
              :class="mentionTriggerType === 'offender' ? 'bg-warning-subtle' : 'bg-info-subtle'"
            >
              <div class="d-flex align-center gap-2">
                <UiIcon
                  :color="mentionTriggerType === 'offender' ? 'warning' : 'info'"
                  :name="mentionTriggerType === 'offender' ? 'alert' : 'shieldUser'"
                  size="18"
                />
                <span class="text-caption font-weight-bold">
                  {{
                    mentionTriggerType === 'offender'
                      ? 'Selecione o Ofensor (@):'
                      : 'Selecione a Vítima (/):'
                  }}
                </span>
              </div>
              <UiChip
                :color="mentionTriggerType === 'offender' ? 'warning' : 'info'"
                size="xs"
                variant="soft"
              >
                {{ mentionFilteredOptions.length }} participante(s)
              </UiChip>
            </div>

            <!-- Lista de Opções -->
            <div v-if="mentionFilteredOptions.length > 0" class="py-1">
              <div
                v-for="(option, index) in mentionFilteredOptions"
                :key="`mention-opt-${option.name}-${index}`"
                class="pa-2 px-3 d-flex align-center justify-space-between cursor-pointer mention-item transition-all"
                :class="{
                  'bg-primary-subtle text-primary font-weight-medium': index === mentionActiveIndex,
                  'hover-bg': index !== mentionActiveIndex,
                }"
                @click="onSelectOptionClick(option)"
                @mouseenter="mentionActiveIndex = index"
              >
                <div class="d-flex align-center gap-2">
                  <span
                    class="font-weight-bold"
                    :class="mentionTriggerType === 'offender' ? 'text-warning' : 'text-info'"
                  >
                    {{ mentionTriggerChar }}
                  </span>
                  <span class="text-body-2 font-weight-medium">{{ option.name }}</span>
                </div>
                <UiChip v-if="option.classroom" color="neutral" size="xs" variant="outline">
                  {{ option.classroom }}
                </UiChip>
              </div>
            </div>

            <!-- Estado Vazio / Sem Participantes Cadastrados -->
            <div v-else class="pa-4 text-center text-caption text-medium-emphasis">
              <div v-if="mentionAvailableParticipants.length === 0">
                Nenhum {{ mentionTriggerType === 'offender' ? 'ofensor' : 'vítima' }} cadastrado nos
                campos acima.
              </div>
              <div v-else>Nenhum participante encontrado com "{{ mentionQuery }}".</div>
            </div>

            <!-- Rodapé com Dicas de Atalho de Teclado -->
            <div
              class="pa-2 px-3 bg-surface-variant border-t d-flex align-center justify-space-between text-caption text-medium-emphasis"
            >
              <span
                >Use <kbd>↑</kbd> <kbd>↓</kbd> para navegar e <kbd>Enter</kbd> ou
                <kbd>Tab</kbd> para selecionar</span
              >
              <UiButton size="xs" variant="ghost" @click="closeMentionMenu">
                Fechar (Esc)
              </UiButton>
            </div>
          </UiCard>
        </div>
      </div>

      <!-- 5. Aceite de Termos e Conformidade -->
      <UiCard border class="pa-4 bg-surface" elevation="0" rounded="lg">
        <UiCheckbox v-model="termsAccepted" color="primary" hide-details="auto">
          <template #label>
            <span class="text-body-2">
              {{ SCHOOL_INCIDENT_TERMS_TEXT }}
            </span>
          </template>
        </UiCheckbox>
      </UiCard>
    </div>

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="modelValue = false">
        Cancelar
      </UiButton>
      <UiButton
        color="primary"
        :disabled="!isValid"
        :loading="isSaving"
        variant="solid"
        @click="handleSubmit"
      >
        Registrar Ocorrência
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
  .mention-item:hover,
  .hover-bg:hover {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }

  .bg-warning-subtle {
    background-color: rgba(var(--v-theme-warning), 0.12);
  }

  .bg-info-subtle {
    background-color: rgba(var(--v-theme-info), 0.12);
  }

  .bg-primary-subtle {
    background-color: rgba(var(--v-theme-primary), 0.12);
  }
</style>
