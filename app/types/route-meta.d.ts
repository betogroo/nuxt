export type NavTarget = 'drawer' | 'home' | 'admin-shortcuts'
export type NavGroup = 'public' | 'management' | 'iirgd' | 'admin'
export type UserRole = 'admin' | 'uge' | 'iirgd' | 'user'

declare module 'vue-router' {
  interface RouteMeta {
    icon?: string
    navLabel?: string
    navSubtitle?: string
    navColor?: string
    navGroup?: NavGroup
    navOrder?: number
    roles?: UserRole[]
    showIn?: NavTarget[]
  }
}
