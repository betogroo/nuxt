import 'vue-router'

export type UserRole =
  | 'admin'
  | 'uge'
  | 'iirgd_user'
  | 'iirgd_manager'
  | 'user'
  | 'user-election'
  | 'manager-election'
  | 'admin-election'
export type NavTarget = 'drawer' | 'home' | 'admin-shortcuts'
export type NavGroup = 'public' | 'management' | 'iirgd' | 'elections' | 'admin' | 'info'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    navLabel?: string
    navSubtitle?: string
    navColor?: string
    navGroup?: NavGroup
    navSubgroup?: string
    navOrder?: number
    icon?: string
    order?: number
    roles?: UserRole[]
    showIn?: NavTarget[]
  }
}
