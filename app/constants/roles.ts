import type { UserRole } from '~/types/route-meta'

export const ROLES = {
  ADMIN: 'admin',
  UGE: 'uge',
  IIRGD_USER: 'iirgd_user',
  IIRGD_MANAGER: 'iirgd_manager',
  USER: 'user',
} as const satisfies Record<string, UserRole>

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  uge: 'UGE',
  iirgd_user: 'IIRGD',
  iirgd_manager: 'Gestor IIRGD',
  user: 'Usuário',
}
