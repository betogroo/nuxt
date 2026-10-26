import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, computed, nextTick } from 'vue'
import ProfilePage from '~/pages/profile.vue'

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn((file: File) => `blob:mock/${file.name}`)
} else {
  vi.spyOn(globalThis.URL, 'createObjectURL').mockImplementation(
    (file: File) => `blob:mock/${file.name}`,
  )
}

if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn()
} else {
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {})
}

const mockUser = ref({
  id: 'usr-123',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
})

const mockProfile = ref<{
  id: string
  name: string
  role: string
  avatar_url: string | null
} | null>({
  id: 'usr-123',
  name: 'Test User',
  role: 'admin',
  avatar_url: 'https://example.com/avatar.png',
})

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined)
const mockUploadAvatar = vi.fn().mockResolvedValue('https://example.com/new-avatar.png')
const mockRemoveAvatar = vi.fn().mockResolvedValue(undefined)
const mockLogAction = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('useAuth', () => () => ({
  user: mockUser,
}))

mockNuxtImport('useProfile', () => () => ({
  profile: mockProfile,
  updateProfile: mockUpdateProfile,
  uploadAvatar: mockUploadAvatar,
  removeAvatar: mockRemoveAvatar,
}))

mockNuxtImport('useLogger', () => () => ({
  logAction: mockLogAction,
}))

const formValues = ref<Record<string, string>>({
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
})

mockNuxtImport('useZodForm', () => {
  return () => ({
    errors: ref({}),
    defineField: (field: string) => [
      computed({
        get: () => formValues.value[field] || '',
        set: (val: string) => {
          formValues.value[field] = val
        },
      }),
      {},
    ],
    resetForm: ({ values }: { values?: Record<string, string> }) => {
      if (values) {
        formValues.value = { ...values }
      }
    },
    handleSubmit: (fn: (values: Record<string, string>) => Promise<void>) => async (e?: Event) => {
      if (e?.preventDefault) e.preventDefault()
      return await fn(formValues.value)
    },
  })
})

const stubs = {
  PageHeader: { template: '<div class="page-header"><slot name="actions" /></div>' },
  UiRow: { template: '<div class="ui-row"><slot /></div>' },
  UiCol: { template: '<div class="ui-col"><slot /></div>' },
  UiCard: { template: '<div class="ui-card"><slot name="header" /><slot /></div>' },
  UiIcon: { template: '<i class="ui-icon" />' },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiAvatar: { template: '<div class="ui-avatar"><slot /></div>' },
  UiImg: { template: '<img class="ui-img" :src="$attrs.src" />' },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiButton: {
    name: 'UiButton',
    emits: ['click'],
    template:
      '<button class="ui-button" :type="$attrs.type || \'button\'" :disabled="$attrs.disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  UiForm: {
    name: 'UiForm',
    emits: ['submit'],
    template: '<form class="ui-form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
  },
  UiFileInput: {
    name: 'UiFileInput',
    emits: ['update:modelValue'],
    template: `
      <div>
        <input type="file" class="ui-file-input" @change="$emit('update:modelValue', $event.target.files?.[0] || null)" />
        <span v-for="msg in errorMessages" :key="msg" class="file-error">{{ msg }}</span>
      </div>
    `,
    props: ['modelValue', 'label', 'accept', 'errorMessages'],
  },
  UiInput: {
    name: 'UiInput',
    emits: ['update:modelValue'],
    template:
      '<input class="ui-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label', 'errorMessages'],
  },
  UiDivider: { template: '<hr class="ui-divider" />' },
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value = {
      id: 'usr-123',
      email: 'test@example.com',
      user_metadata: { name: 'Test User' },
    }
    mockProfile.value = {
      id: 'usr-123',
      name: 'Test User',
      role: 'admin',
      avatar_url: 'https://example.com/avatar.png',
    }
    formValues.value = {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
    }
  })

  it('renders user details, email, and role', async () => {
    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    expect(wrapper.text()).toContain('test@example.com')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('renders initials when no avatar is set', async () => {
    mockProfile.value = {
      id: 'usr-123',
      name: 'Carlos Santos',
      role: 'user',
      avatar_url: null,
    }
    formValues.value = {
      name: 'Carlos Santos',
      avatar_url: '',
    }

    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    expect(wrapper.text()).toContain('C')
  })

  it('handles selecting a valid image file and submits with uploaded avatar', async () => {
    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    const validFile = new File(['valid-image-bytes'], 'avatar.png', { type: 'image/png' })

    const fileInput = wrapper.findComponent({ name: 'UiFileInput' })
    await fileInput.vm.$emit('update:modelValue', validFile)
    await nextTick()

    expect(wrapper.text()).toContain('Nova foto selecionada')

    // Submit form
    const form = wrapper.findComponent({ name: 'UiForm' })
    await form.trigger('submit')
    await nextTick()

    expect(mockUploadAvatar).toHaveBeenCalledWith(validFile)
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: 'Test User',
      avatar_url: 'https://example.com/new-avatar.png',
    })
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_PROFILE',
      'O usuário atualizou seus dados de perfil.',
      'usr-123',
    )
    expect(wrapper.text()).toContain('Perfil atualizado com sucesso!')
  })

  it('validates file size exceeding 5MB', async () => {
    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    const largeFile = new File(['x'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

    const fileInput = wrapper.findComponent({ name: 'UiFileInput' })
    await fileInput.vm.$emit('update:modelValue', largeFile)
    await nextTick()

    expect(wrapper.text()).toContain('deve ter no máximo 5MB')
    expect(wrapper.text()).not.toContain('Nova foto selecionada')
  })

  it('validates unsupported file format', async () => {
    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    const pdfFile = new File(['pdf-bytes'], 'doc.pdf', { type: 'application/pdf' })

    const fileInput = wrapper.findComponent({ name: 'UiFileInput' })
    await fileInput.vm.$emit('update:modelValue', pdfFile)
    await nextTick()

    expect(wrapper.text()).toContain('Formato inválido')
    expect(wrapper.text()).not.toContain('Nova foto selecionada')
  })

  it('handles removing photo and submitting form', async () => {
    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    // Find "Remover Foto" button
    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const removeBtn = buttons.find((btn) => btn.text().includes('Remover Foto'))
    expect(removeBtn).toBeDefined()

    await removeBtn?.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Foto será removida')

    // Submit form
    const form = wrapper.findComponent({ name: 'UiForm' })
    await form.trigger('submit')
    await nextTick()

    expect(mockRemoveAvatar).toHaveBeenCalledTimes(1)
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: 'Test User',
      avatar_url: null,
    })
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_PROFILE',
      'O usuário atualizou seus dados de perfil.',
      'usr-123',
    )
  })

  it('displays error message when updateProfile throws', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('Falha no banco de dados'))

    const wrapper = mount(ProfilePage, { global: { stubs } })
    await nextTick()

    const form = wrapper.findComponent({ name: 'UiForm' })
    await form.trigger('submit')
    await nextTick()

    expect(wrapper.text()).toContain('Erro ao salvar o perfil: Falha no banco de dados')
  })
})
