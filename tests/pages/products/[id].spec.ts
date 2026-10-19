import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ProductDetailPage from '~/pages/products/[id].vue'
import { ROLES } from '~/constants/roles'

const mockProductData = ref<Record<string, unknown> | null>(null)
const mockDemandsData = ref<Array<Record<string, unknown>>>([])
const mockProfile = ref<{ role: string } | null>({ role: ROLES.ADMIN })

const mockToggleProductStatus = vi.fn()
const mockUpdateProduct = vi.fn().mockResolvedValue({})
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
const mockRefresh = vi.fn()

const buildProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-1',
  name: 'Papel A4',
  cat_mat: 123456,
  cat_bec: 78910,
  is_active: true,
  created_at: '2026-01-15T08:00:00Z',
  updated_at: '2026-02-15T08:00:00Z',
  created_by: 'user-1',
  expense_nature_id: '339030',
  product_class_id: '7510',
  expense_natures: { id: '339030', name: 'Material de Consumo' },
  product_classes: { id: '7510', name: 'Material de Escritório' },
  profiles: { name: 'Maria' },
  units: [
    {
      id: 'unit-1',
      name: 'Pacote 100 Unidade',
      is_pending: false,
      is_active: true,
      aliases: [
        { id: 'a1', code: 201, name: 'Pacote 100 Unidade' },
        { id: 'a2', code: 36, name: 'Cento' },
      ],
    },
    {
      id: 'unit-2',
      name: 'Resma Nova',
      is_pending: true,
      is_active: false,
      aliases: [],
    },
  ],
  ...overrides,
})

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ params: { id: 'prod-1' } }))
mockNuxtImport('useRouter', () => () => ({ back: vi.fn(), push: vi.fn() }))
mockNuxtImport('useCopyToClipboard', () => () => ({ copy: vi.fn() }))
mockNuxtImport('useProfile', () => () => ({ profile: mockProfile }))
mockNuxtImport('useProducts', () => () => ({
  fetchProductById: vi.fn(),
  fetchProductDemands: vi.fn(),
  toggleProductStatus: mockToggleProductStatus,
  updateProduct: mockUpdateProduct,
  addProductUnit: vi.fn(),
  removeProductUnit: vi.fn(),
}))
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchAllActiveUnits: vi.fn().mockResolvedValue([]),
}))
mockNuxtImport('useExpenseNatures', () => () => ({
  fetchAllActiveExpenseNatures: vi
    .fn()
    .mockResolvedValue([{ id: '339030', name: 'Material de Consumo' }]),
  registerPendingExpenseNature: vi.fn(),
}))
mockNuxtImport('useProductClasses', () => () => ({
  fetchAllActiveProductClasses: vi
    .fn()
    .mockResolvedValue([{ id: '7510', name: 'Material de Escritório' }]),
  registerPendingProductClass: vi.fn(),
}))
mockNuxtImport('useAsyncData', () => {
  return (key: string) => {
    if (key.startsWith('product-demands-')) {
      return { data: mockDemandsData, pending: ref(false), refresh: vi.fn() }
    }
    if (key.startsWith('product-')) {
      return { data: mockProductData, pending: ref(false), refresh: mockRefresh }
    }
    return { data: ref([]), pending: ref(false), refresh: vi.fn() }
  }
})

const stubs = {
  UiContainer: { template: '<div><slot /></div>' },
  UiRow: { template: '<div><slot /></div>' },
  UiCol: { template: '<div><slot /></div>' },
  UiCard: {
    props: ['title'],
    template:
      '<section class="ui-card"><h2>{{ title }}</h2><slot name="header" /><slot /></section>',
  },
  UiButton: {
    props: ['icon', 'loading'],
    template:
      '<button class="ui-button" :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
  },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiIcon: { template: '<i />' },
  UiSpacer: { template: '<span />' },
  UiTooltip: { template: '<div><slot name="activator" :props="{}" /></div>' },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiCombobox: { template: '<input class="ui-combobox" />' },
  UiSlideYTransition: { template: '<div><slot /></div>' },
  UiProgressCircular: { template: '<div class="ui-progress" />' },
  NuxtLink: { template: '<a><slot /></a>' },
  UiModal: { template: '<div class="ui-modal"><slot /><slot name="actions" /></div>' },
  UiInput: true,
  UiSwitch: true,
  UiAutocomplete: { props: ['items'], template: '<div class="ui-autocomplete"><slot /></div>' },
  UiTable: {
    props: ['headers', 'items'],
    template: `
      <div class="ui-table-stub">
        <div v-for="(item, i) in items" :key="i" class="table-row">
          <template v-for="h in headers" :key="h.value">
            <slot :name="'item-' + h.value" :item="item" />
          </template>
        </div>
        <div v-if="!items || items.length === 0" class="table-empty"><slot name="empty" /></div>
      </div>
    `,
  },
}

const mountPage = () => mount(ProductDetailPage, { global: { stubs } })

describe('Product Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductData.value = buildProduct()
    mockDemandsData.value = []
    mockProfile.value = { role: ROLES.ADMIN }
  })

  it('renders name, status, nature, class, CATMAT and CATBEC', () => {
    const wrapper = mountPage()
    const text = wrapper.text()
    expect(text).toContain('Papel A4')
    expect(text).toContain('339030')
    expect(text).toContain('7510')
    expect(text).toContain('123456')
    expect(text).toContain('78910')
    expect(text).toContain('ATIVO')
    expect(text).toContain('Material de Consumo')
    expect(text).toContain('Classe do Produto')
    expect(text).toContain('Material de Escritório')
  })

  it('shows "Não informada" when class is missing', () => {
    mockProductData.value = buildProduct({ product_classes: null })
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Não informada')
  })

  it('renders units with their aliases and pending status', () => {
    const wrapper = mountPage()
    const text = wrapper.text()
    expect(text).toContain('Pacote 100 Unidade')
    expect(text).toContain('201 - Pacote 100 Unidade')
    expect(text).toContain('36 - Cento')
    expect(text).toContain('Pendente')
    expect(text).toContain('Sem registros alternativos')
  })

  it('shows empty state when product has no units', () => {
    mockProductData.value = buildProduct({ units: [] })
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Nenhuma apresentação vinculada')
  })

  it('lists demands that use the product', () => {
    mockDemandsData.value = [
      {
        item_id: 'i1',
        id: 'dem-1',
        name: 'Compra de Papel',
        status: 'completed',
        process_number: '042/2026',
        dispute_date: '2026-06-15T14:00:00Z',
        quantity: 10,
        unit_name: 'Pacote 100 Unidade',
      },
    ]
    const wrapper = mountPage()
    const text = wrapper.text()
    expect(text).toContain('Compra de Papel')
    expect(text).toContain('042/2026')
    expect(text).toContain('10 Pacote 100 Unidade')
  })

  it('shows empty state when product is not used in demands', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Este produto ainda não foi usado em nenhuma demanda')
  })

  it('shows toggle button for admin and calls toggleProductStatus', async () => {
    const wrapper = mountPage()
    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Inativar Produto'))
    expect(toggleBtn).toBeDefined()
    await toggleBtn!.trigger('click')
    await Promise.resolve()
    expect(mockToggleProductStatus).toHaveBeenCalled()
  })

  it('hides toggle button for non-admin users', () => {
    mockProfile.value = { role: ROLES.USER }
    const wrapper = mountPage()
    expect(wrapper.text()).not.toContain('Inativar Produto')
    expect(wrapper.text()).not.toContain('Ativar Produto')
  })

  it('shows not found alert when product is null', () => {
    mockProductData.value = null
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Produto não encontrado.')
  })

  it('allows admin to open edit modal and save updated CATMAT and CATBEC', async () => {
    const wrapper = mountPage()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditModal()
    expect(vm.editModal.isOpen.value).toBe(true)
    expect(vm.editName).toBe('Papel A4')
    expect(vm.editCatMat).toBe(123456)
    expect(vm.editCatBec).toBe(78910)

    vm.editCatMat = 998877
    vm.editCatBec = 554433

    await vm.saveProductEdit()

    expect(mockUpdateProduct).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        name: 'Papel A4',
        cat_mat: 998877,
        cat_bec: 554433,
      }),
    )
    expect(vm.editModal.isOpen.value).toBe(false)
  })
})
