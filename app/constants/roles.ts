import type { UserRole } from '~/types/route-meta'

export const ROLES = {
  ADMIN: 'admin',
  UGE: 'uge',
  IIRGD: 'iirgd',
  USER: 'user',
} as const satisfies Record<string, UserRole>

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  uge: 'UGE',
  iirgd: 'IIRGD',
  user: 'Usuário',
}
