import 'vue-router'

export type UserRole = 'admin' | 'uge' | 'iirgd_user' | 'iirgd_manager' | 'user'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    order?: number
    roles?: UserRole[]
  }
}
