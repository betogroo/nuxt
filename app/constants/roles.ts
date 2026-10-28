import type { UserRole } from '~/types/route-meta'

export const ROLES = {
  ADMIN: 'admin',
  UGE: 'uge',
  IIRGD_USER: 'iirgd_user',
  IIRGD_MANAGER: 'iirgd_manager',
  USER: 'user',
  USER_ELECTION: 'user-election',
  MANAGER_ELECTION: 'manager-election',
  ADMIN_ELECTION: 'admin-election',
} as const satisfies Record<string, UserRole>

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  uge: 'UGE',
  iirgd_user: 'IIRGD',
  iirgd_manager: 'Gestor IIRGD',
  user: 'Usuário',
  'user-election': 'Usuário Eleições',
  'manager-election': 'Gestor Eleições',
  'admin-election': 'Administrador Eleições',
}

export interface UserRoleChipConfig {
  color: string
  label: string
  variant: 'flat' | 'tonal' | 'outlined' | 'solid'
}

export const USER_ROLE_CONFIG: Record<string, UserRoleChipConfig> = {
  admin: { color: 'primary', label: 'Admin', variant: 'flat' },
  uge: { color: 'warning', label: 'UGE', variant: 'tonal' },
  iirgd_user: { color: 'info', label: 'IIRGD', variant: 'tonal' },
  iirgd_manager: { color: 'info', label: 'Gestor IIRGD', variant: 'solid' },
  user: { color: 'default', label: 'Usuário', variant: 'outlined' },
}
