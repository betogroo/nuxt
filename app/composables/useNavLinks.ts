import type { NavTarget, NavGroup, UserRole } from '~/types/route-meta'
import { ROLES } from '~/constants/roles'

export interface NavLinkMeta {
  path: string
  label: string
  subtitle: string
  icon: string
  color: string
  roles: UserRole[]
  showIn: NavTarget[]
  navGroup: NavGroup
  navOrder: number
}

const GROUP_LABELS: Record<NavGroup, string> = {
  public: '',
  management: 'Gestão',
  iirgd: 'IIRGD',
  admin: 'Administração',
}

const GROUP_ORDER: Record<NavGroup, number> = {
  public: 0,
  management: 1,
  iirgd: 2,
  admin: 3,
}

export const useNavLinks = () => {
  const router = useRouter()
  const { profile } = useProfile()

  const userRole = computed<UserRole>(() => (profile.value?.role as UserRole) || ROLES.USER)

  /** All routes that opted-in to the navigation system via showIn */
  const allNavLinks = computed<NavLinkMeta[]>(() =>
    router
      .getRoutes()
      .filter((r) => Array.isArray(r.meta?.showIn) && (r.meta.showIn as NavTarget[]).length > 0)
      .map((r) => ({
        path: r.path,
        label: (r.meta.navLabel as string) || r.path,
        subtitle: (r.meta.navSubtitle as string) || '',
        icon: (r.meta.icon as string) || 'circle',
        color: (r.meta.navColor as string) || 'primary',
        roles: (r.meta.roles as UserRole[]) || [],
        showIn: (r.meta.showIn as NavTarget[]) || [],
        navGroup: (r.meta.navGroup as NavGroup) || 'public',
        navOrder: (r.meta.navOrder as number) ?? 99,
      }))
      .sort((a, b) => {
        const groupDiff = GROUP_ORDER[a.navGroup] - GROUP_ORDER[b.navGroup]
        return groupDiff !== 0 ? groupDiff : a.navOrder - b.navOrder
      }),
  )

  /** Filter links by the current user's role */
  const forRole = (links: NavLinkMeta[]) =>
    links.filter((l) => l.roles.length === 0 || l.roles.includes(userRole.value))

  /** Filter links by nav target */
  const forTarget = (target: NavTarget) =>
    computed(() => forRole(allNavLinks.value.filter((l) => l.showIn.includes(target))))

  /** Flat list of drawer links filtered by role */
  const drawerLinks = forTarget('drawer')

  /** Drawer links grouped by navGroup for rendering section headers */
  const drawerByGroup = computed<Array<{ group: NavGroup; label: string; links: NavLinkMeta[] }>>(
    () => {
      const seen = new Set<NavGroup>()
      const result: Array<{ group: NavGroup; label: string; links: NavLinkMeta[] }> = []
      for (const link of drawerLinks.value) {
        if (!seen.has(link.navGroup)) {
          seen.add(link.navGroup)
          result.push({ group: link.navGroup, label: GROUP_LABELS[link.navGroup], links: [] })
        }
        result[result.length - 1].links.push(link)
      }
      return result
    },
  )

  /** Cards for the home page quick-access section */
  const homeLinks = forTarget('home')

  /** Shortcut buttons for the admin dashboard */
  const adminShortcuts = forTarget('admin-shortcuts')

  return { drawerLinks, drawerByGroup, homeLinks, adminShortcuts }
}
