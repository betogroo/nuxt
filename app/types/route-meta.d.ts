import 'vue-router'

export type UserRole = 'admin' | 'uge' | 'iirgd_user' | 'iirgd_manager' | 'user'
export type NavTarget = 'drawer' | 'home' | 'admin-shortcuts'
export type NavGroup = 'public' | 'management' | 'iirgd' | 'admin' | 'info'

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
