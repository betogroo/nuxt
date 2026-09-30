import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Mock useRouter with controlled routes
const mockGetRoutes = vi.fn()
mockNuxtImport('useRouter', () => () => ({
  getRoutes: mockGetRoutes,
}))

// Mock useProfile with a ref that we can override per test
const mockProfileRef = ref<{ role: string } | null>(null)
mockNuxtImport('useProfile', () => () => ({
  profile: mockProfileRef,
}))

describe('useNavLinks', () => {
  beforeEach(() => {
    mockGetRoutes.mockReturnValue([
      {
        path: '/demands',
        meta: {
          icon: 'mdi-clipboard-list-outline',
          navLabel: 'Demandas',
          navSubtitle: 'Processos de compras',
          navColor: 'primary',
          navGroup: 'management',
          navOrder: 10,
          roles: ['admin', 'uge'],
          showIn: ['drawer', 'home'],
        },
      },
      {
        path: '/iirgd',
        meta: {
          icon: 'mdi-badge-account-outline',
          navLabel: 'IIRGD',
          navSubtitle: 'Módulo IIRGD',
          navColor: 'deep-purple',
          navGroup: 'iirgd',
          navOrder: 40,
          roles: ['admin', 'iirgd'],
          showIn: ['drawer', 'home'],
        },
      },
      {
        path: '/users',
        meta: {
          icon: 'mdi-account-group-outline',
          navLabel: 'Usuários',
          navSubtitle: 'Contas e permissões',
          navColor: 'primary',
          navGroup: 'admin',
          navOrder: 60,
          roles: ['admin'],
          showIn: ['drawer', 'home', 'admin-shortcuts'],
        },
      },
      {
        path: '/admin/units',
        meta: {
          icon: 'mdi-scale-balance',
          navLabel: 'Unidades de Medida',
          navSubtitle: 'Gerencie unidades',
          navColor: 'warning',
          navGroup: 'admin',
          navOrder: 80,
          roles: ['admin'],
          showIn: ['drawer', 'admin-shortcuts'],
        },
      },
      {
        path: '/no-nav',
        meta: { icon: 'mdi-test' }, // no showIn — must be excluded
      },
    ])
  })

  it('excludes routes that have no showIn defined', () => {
    mockProfileRef.value = { role: 'admin' }
    const { drawerLinks } = useNavLinks()
    const paths = drawerLinks.value.map((l) => l.path)
    expect(paths).not.toContain('/no-nav')
  })

  it('filters drawerLinks by user role — uge only sees management links', () => {
    mockProfileRef.value = { role: 'uge' }
    const { drawerLinks } = useNavLinks()
    const paths = drawerLinks.value.map((l) => l.path)
    expect(paths).toContain('/demands')
    expect(paths).not.toContain('/users')
    expect(paths).not.toContain('/iirgd')
    expect(paths).not.toContain('/admin/units')
  })

  it('filters homeLinks to only include showIn: home routes', () => {
    mockProfileRef.value = { role: 'admin' }
    const { homeLinks } = useNavLinks()
    const paths = homeLinks.value.map((l) => l.path)
    expect(paths).toContain('/demands')
    expect(paths).toContain('/users')
    expect(paths).not.toContain('/admin/units') // only drawer + admin-shortcuts
  })

  it('filters adminShortcuts to only include showIn: admin-shortcuts routes', () => {
    mockProfileRef.value = { role: 'admin' }
    const { adminShortcuts } = useNavLinks()
    const paths = adminShortcuts.value.map((l) => l.path)
    expect(paths).toContain('/users')
    expect(paths).toContain('/admin/units')
    expect(paths).not.toContain('/demands') // drawer + home only
    expect(paths).not.toContain('/iirgd') // drawer + home only
  })

  it('sorts links by navGroup order then navOrder within each group', () => {
    mockProfileRef.value = { role: 'admin' }
    const { drawerLinks } = useNavLinks()
    const paths = drawerLinks.value.map((l) => l.path)
    // management (order 1) comes before iirgd (order 2) comes before admin (order 3)
    expect(paths.indexOf('/demands')).toBeLessThan(paths.indexOf('/iirgd'))
    expect(paths.indexOf('/iirgd')).toBeLessThan(paths.indexOf('/users'))
    // within admin group, users (60) comes before units (80)
    expect(paths.indexOf('/users')).toBeLessThan(paths.indexOf('/admin/units'))
  })

  it('groups drawerByGroup correctly with section labels', () => {
    mockProfileRef.value = { role: 'admin' }
    const { drawerByGroup } = useNavLinks()
    const groups = drawerByGroup.value
    const mgmt = groups.find((g) => g.group === 'management')
    const admin = groups.find((g) => g.group === 'admin')
    expect(mgmt?.label).toBe('Gestão')
    expect(admin?.label).toBe('Administração')
    expect(mgmt?.links.map((l) => l.path)).toContain('/demands')
    expect(admin?.links.map((l) => l.path)).toContain('/users')
  })

  it('admin role sees all links', () => {
    mockProfileRef.value = { role: 'admin' }
    const { drawerLinks } = useNavLinks()
    const paths = drawerLinks.value.map((l) => l.path)
    expect(paths).toContain('/demands')
    expect(paths).toContain('/iirgd')
    expect(paths).toContain('/users')
    expect(paths).toContain('/admin/units')
  })

  it('iirgd role sees only iirgd links', () => {
    mockProfileRef.value = { role: 'iirgd' }
    const { drawerLinks } = useNavLinks()
    const paths = drawerLinks.value.map((l) => l.path)
    expect(paths).toContain('/iirgd')
    expect(paths).not.toContain('/demands')
    expect(paths).not.toContain('/users')
  })
})
