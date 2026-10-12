import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DefaultLayout from '~/layouts/default.vue'

mockNuxtImport('useSupabaseUser', () => () => ref({ id: 'user-123', email: 'admin@gov.br' }))
mockNuxtImport('useAuth', () => () => ({ signOut: vi.fn() }))
mockNuxtImport('useProfile', () => () => ({
  profile: ref({ id: 'user-123', name: 'Administrador', role: 'admin' }),
  fetchProfile: vi.fn(),
}))
mockNuxtImport('usePageIcon', () => () => ({ getIcon: vi.fn(() => 'circle') }))
mockNuxtImport('useRoute', () => () => ({ path: '/admin/units' }))

const mockPendingTasks = {
  pendingUnitsCount: ref(3),
  pendingExpenseNaturesCount: ref(2),
  pendingProductClassesCount: ref(1),
  pendingReturnsCount: ref(0),
  totalPending: ref(6),
}
mockNuxtImport('usePendingTasks', () => () => mockPendingTasks)

const mockSections = [
  {
    group: 'admin',
    label: 'Administração',
    directLinks: [
      {
        path: '/admin',
        label: 'Painel Geral',
        icon: 'dashboard',
        color: 'success',
        roles: ['admin'],
        showIn: ['drawer'],
        navGroup: 'admin',
        navOrder: 10,
        subtitle: '',
      },
    ],
    subgroups: [
      {
        id: 'admin-catalogs',
        label: 'Cadastros Auxiliares',
        icon: 'categories',
        links: [
          {
            path: '/admin/units',
            label: 'Unidades de Medida',
            icon: 'balance',
            color: 'warning',
            roles: ['admin'],
            showIn: ['drawer'],
            navGroup: 'admin',
            navSubgroup: 'catalogs',
            navOrder: 10,
            subtitle: '',
          },
          {
            path: '/admin/expense-natures',
            label: 'Naturezas de Despesa',
            icon: 'finances',
            color: 'orange',
            roles: ['admin'],
            showIn: ['drawer'],
            navGroup: 'admin',
            navSubgroup: 'catalogs',
            navOrder: 20,
            subtitle: '',
          },
        ],
      },
    ],
  },
]

mockNuxtImport('useNavLinks', () => () => ({
  drawerSections: ref(mockSections),
  drawerLinks: ref([]),
  drawerByGroup: ref([]),
  homeLinks: ref([]),
  adminShortcuts: ref([]),
}))

const defaultStubs = {
  UiApp: { template: '<div><slot /></div>' },
  UiToast: true,
  UiNavigationDrawer: { template: '<aside><slot /><slot name="append" /></aside>' },
  UiAvatar: { template: '<div><slot /></div>' },
  UiIcon: true,
  UiDivider: true,
  UiList: { template: '<nav><slot /></nav>' },
  UiListItem: {
    template:
      '<div><span>{{ $attrs.title }}</span><slot name="prepend" /><slot /><slot name="append" /></div>',
  },
  UiListGroup: {
    template: '<div><slot name="activator" :props="{}" /><slot /></div>',
  },
  UiBadge: {
    props: ['content'],
    template: '<span class="badge">{{ content }}</span>',
  },
  UiAppBar: { template: '<header><slot /><slot name="prepend" /></header>' },
  UiAppBarNavIcon: true,
  UiSpacer: true,
  ThemeToggle: true,
  UiMenu: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
  UiCard: { template: '<div><slot /></div>' },
  UiListItemTitle: { template: '<div><slot /></div>' },
  UiListItemSubtitle: { template: '<div><slot /></div>' },
  UiChip: { template: '<span><slot /></span>' },
  UiButton: { template: '<button><slot /></button>' },
  UiTooltip: { template: '<div><slot name="activator" :props="{}" /></div>' },
  UiMain: { template: '<main><slot /></main>' },
  UiContainer: { template: '<div><slot /></div>' },
}

describe('Default Layout Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render structured navigation with direct links and subgroups', async () => {
    const wrapper = mount(DefaultLayout, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Painel Geral')
    expect(wrapper.text()).toContain('Cadastros Auxiliares')
    expect(wrapper.text()).toContain('Unidades de Medida')
    expect(wrapper.text()).toContain('Naturezas de Despesa')
  })

  it('should display aggregated pending badges on subgroup activator', async () => {
    const wrapper = mount(DefaultLayout, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    // Subgroup Cadastros has units (3) + expense-natures (2) = 5
    expect(wrapper.text()).toContain('5')
  })
})
