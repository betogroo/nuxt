import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DefaultLayout from '~/layouts/default.vue'

const mockProfile = ref<{ id: string; name: string; role: string; avatar_url?: string | null }>({
  id: 'user-123',
  name: 'Administrador',
  role: 'admin',
  avatar_url: null,
})

mockNuxtImport('useSupabaseUser', () => () => ref({ id: 'user-123', email: 'admin@gov.br' }))
mockNuxtImport('useAuth', () => () => ({ signOut: vi.fn() }))
mockNuxtImport('useProfile', () => () => ({
  profile: mockProfile,
  fetchProfile: vi.fn(),
}))
mockNuxtImport('usePageIcon', () => () => ({ getIcon: vi.fn(() => 'circle') }))
mockNuxtImport('useRoute', () => () => ({ path: '/admin/units' }))

const mockPendingTasks = {
  pendingUnitsCount: ref(3),
  pendingExpenseNaturesCount: ref(2),
  pendingProductClassesCount: ref(1),
  pendingCharacteristicKeysCount: ref(0),
  pendingReturnsCount: ref(0),
  totalPending: ref(6),
  refreshAll: vi.fn().mockResolvedValue(undefined),
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
  UiAvatar: { template: '<div class="ui-avatar"><slot /></div>' },
  UiImg: {
    props: ['src', 'alt'],
    template: '<img class="ui-img" :src="src" :alt="alt" />',
  },
  UiIcon: true,
  UiDivider: true,
  UiList: {
    props: ['density', 'nav'],
    template: '<nav :data-density="density"><slot /></nav>',
  },
  UiListItem: {
    props: ['density', 'title', 'to'],
    template:
      '<div class="list-item" :data-density="density"><span>{{ $attrs.title || title }}</span><slot name="prepend" /><slot /><slot name="append" /></div>',
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

  it('should render drawer list and items with compact density for slimmer links', async () => {
    const wrapper = mount(DefaultLayout, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const nav = wrapper.find('aside nav')
    expect(nav.exists()).toBe(true)
    expect(nav.attributes('data-density')).toBe('compact')

    const items = wrapper.findAll('aside .list-item')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.attributes('data-density')).toBe('compact')
    }
  })

  it('should display image avatar in nav-bar, user menu, and drawer when profile has avatar_url', async () => {
    mockProfile.value = {
      id: 'user-123',
      name: 'Administrador',
      role: 'admin',
      avatar_url: 'https://storage.supabase.co/avatars/user-123/avatar.png',
    }

    const wrapper = mount(DefaultLayout, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const avatarImages = wrapper.findAll('img.ui-img')
    expect(avatarImages.length).toBeGreaterThanOrEqual(2)
    for (const img of avatarImages) {
      expect(img.attributes('src')).toBe('https://storage.supabase.co/avatars/user-123/avatar.png')
    }
  })

  it('should fallback to userInitial when profile has no avatar_url', async () => {
    mockProfile.value = {
      id: 'user-123',
      name: 'Administrador',
      role: 'admin',
      avatar_url: null,
    }

    const wrapper = mount(DefaultLayout, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    expect(wrapper.findAll('img.ui-img').length).toBe(0)
    expect(wrapper.text()).toContain('A')
  })
})
