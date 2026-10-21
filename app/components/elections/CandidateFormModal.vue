<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useCandidates } from '~/composables/useCandidates'
  import { useToast } from '~/composables/useToast'
  import { createCandidateSchema } from '~/schemas/forms/candidate'
  import type { CandidateRow, CandidateInput } from '~/types/candidate'

  const props = withDefaults(
    defineProps<{
      electionId: string
      digitsCount?: number
      isUppercase?: boolean
    }>(),
    {
      digitsCount: 2,
      isUppercase: false,
    },
  )

  const emit = defineEmits<{
    (e: 'saved'): void
  }>()

  const toast = useToast()
  const { createCandidate, updateCandidate, generateRandomPhotoUrl } = useCandidates()

  const isOpen = ref(false)
  const isEditing = ref(false)
  const candidateId = ref<string | null>(null)
  const isSaving = ref(false)
  const formError = ref<string | null>(null)

  // Form fields
  const name = ref('')
  const candidateNumber = ref('')
  const photoUrl = ref('')

  // Field validation errors
  const errors = ref<{
    name?: string
    candidate_number?: string
    photo_url?: string
  }>({})

  const digits = computed(() => Math.max(1, props.digitsCount))

  const randomizePhoto = () => {
    photoUrl.value = generateRandomPhotoUrl(candidateNumber.value || undefined)
  }

  const open = (candidate?: CandidateRow) => {
    formError.value = null
    errors.value = {}

    if (candidate) {
      isEditing.value = true
      candidateId.value = candidate.id
      name.value = candidate.name
      candidateNumber.value = candidate.candidate_number
      photoUrl.value = candidate.photo_url || ''
    } else {
      isEditing.value = false
      candidateId.value = null
      name.value = ''
      candidateNumber.value = ''
      photoUrl.value = generateRandomPhotoUrl()
    }

    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  const handleCandidateNumberInput = (val: string) => {
    // Only allow numbers and limit to max digits
    const clean = val.replace(/\D/g, '').slice(0, digits.value)
    candidateNumber.value = clean
  }

  const validate = (): boolean => {
    errors.value = {}
    formError.value = null

    const schema = createCandidateSchema(digits.value)
    const result = schema.safeParse({
      name: props.isUppercase ? name.value.toUpperCase() : name.value,
      candidate_number: candidateNumber.value,
      photo_url: photoUrl.value.trim() || undefined,
    })

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof errors.value
        if (field && !errors.value[field]) {
          errors.value[field] = issue.message
        }
      }
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    isSaving.value = true
    formError.value = null

    try {
      const finalName = props.isUppercase ? name.value.trim().toUpperCase() : name.value.trim()
      const payload: CandidateInput = {
        name: finalName,
        candidate_number: candidateNumber.value.trim(),
        photo_url: photoUrl.value.trim() || null,
      }

      if (isEditing.value && candidateId.value) {
        await updateCandidate(candidateId.value, payload)
        toast.success('Candidato atualizado com sucesso!')
      } else {
        await createCandidate(props.electionId, payload)
        toast.success('Candidato cadastrado com sucesso!')
      }

      emit('saved')
      close()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar candidato.'
      formError.value = msg
      toast.error(msg)
    } finally {
      isSaving.value = false
    }
  }

  defineExpose({
    open,
    close,
  })
</script>

<template>
  <UiModal
    v-model="isOpen"
    max-width="540px"
    :title="isEditing ? 'Editar Candidato' : 'Cadastrar Novo Candidato'"
  >
    <UiAlert v-if="formError" class="mb-4" type="error" variant="soft">
      {{ formError }}
    </UiAlert>

    <div class="d-flex flex-column ga-4">
      <!-- Preview do Card do Candidato com Foto -->
      <div class="pa-4 border rounded-lg bg-surface-variant d-flex align-center ga-4">
        <UiAvatar class="border" color="primary" rounded="lg" size="72" variant="soft">
          <img
            v-if="photoUrl"
            :alt="name || 'Candidato'"
            class="w-100 h-100 object-cover"
            :src="photoUrl"
          />
          <UiIcon v-else name="vote" size="32" />
        </UiAvatar>

        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex align-center ga-2">
            <span class="text-caption text-medium-emphasis">Número:</span>
            <span class="text-h6 font-weight-bold text-primary font-mono">
              {{ candidateNumber || '-'.repeat(digits) }}
            </span>
          </div>
          <div
            class="text-body-1 font-weight-bold text-truncate"
            :class="{ 'text-uppercase': isUppercase }"
          >
            {{ name || 'Nome do Candidato' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Exigência: {{ digits }} {{ digits === 1 ? 'dígito' : 'dígitos' }}
          </div>
        </div>

        <UiButton
          color="secondary"
          icon="refresh"
          size="sm"
          tooltip="Gerar outra foto aleatória"
          variant="ghost"
          @click="randomizePhoto"
        />
      </div>

      <!-- Nome do Candidato -->
      <div>
        <UiInput
          v-model="name"
          :error-messages="errors.name ? [errors.name] : []"
          label="Nome do Candidato ou Chapa *"
          placeholder="Ex: Ana Silva / Chapa Renovação"
          required
          variant="outline"
        />
        <div v-if="isUppercase" class="text-caption text-primary mt-1">
          * A eleição está configurada para CAIXA ALTA. O nome será padronizado em letras
          maiúsculas.
        </div>
      </div>

      <!-- Número do Candidato -->
      <div>
        <UiInput
          :error-messages="errors.candidate_number ? [errors.candidate_number] : []"
          label="Número do Candidato *"
          :maxlength="digits"
          :model-value="candidateNumber"
          :placeholder="`Ex: ${'1'.repeat(digits)}`"
          required
          variant="outline"
          @update:model-value="handleCandidateNumberInput"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          O número na urna deve possuir exatamente {{ digits }}
          {{ digits === 1 ? 'dígito' : 'dígitos' }}.
        </div>
      </div>

      <!-- URL da Foto do Candidato -->
      <div>
        <div class="d-flex align-center justify-space-between mb-1">
          <label class="text-body-2 font-weight-medium">URL da Foto</label>
          <UiButton
            color="primary"
            prepend-icon="refresh"
            size="xs"
            variant="ghost"
            @click="randomizePhoto"
          >
            Foto Aleatória
          </UiButton>
        </div>
        <UiInput
          v-model="photoUrl"
          :error-messages="errors.photo_url ? [errors.photo_url] : []"
          placeholder="https://exemplo.com/foto.jpg"
          variant="outline"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          Se deixar em branco, uma imagem aleatória da web será associada automaticamente.
        </div>
      </div>
    </div>

    <template #actions>
      <UiButton color="default" :disabled="isSaving" variant="outline" @click="close">
        Cancelar
      </UiButton>
      <UiButton color="primary" :loading="isSaving" variant="solid" @click="handleSubmit">
        {{ isEditing ? 'Salvar Alterações' : 'Cadastrar Candidato' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
  .object-cover {
    object-fit: cover;
  }
</style>
