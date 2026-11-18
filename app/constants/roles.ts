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
  SCHOOL_USER: 'school-user',
  SCHOOL_MANAGER: 'school-manager',
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
  'school-user': 'Usuário Escola',
  'school-manager': 'Gestor Escola',
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
  'user-election': { color: 'teal', label: 'Eleições', variant: 'tonal' },
  'manager-election': { color: 'indigo', label: 'Gestor Eleições', variant: 'solid' },
  'admin-election': { color: 'deep-purple', label: 'Admin Eleições', variant: 'solid' },
  'school-user': { color: 'teal', label: 'Escola', variant: 'tonal' },
  'school-manager': { color: 'primary', label: 'Gestor Escola', variant: 'solid' },
}

export const ROLE_OPTIONS: Array<{ title: string; value: UserRole }> = [
  { title: 'Usuário', value: 'user' },
  { title: 'UGE', value: 'uge' },
  { title: 'Administrador', value: 'admin' },
  { title: 'Usuário IIRGD', value: 'iirgd_user' },
  { title: 'Gestor IIRGD', value: 'iirgd_manager' },
  { title: 'Usuário Eleições', value: 'user-election' },
  { title: 'Gestor Eleições', value: 'manager-election' },
  { title: 'Administrador Eleições', value: 'admin-election' },
  { title: 'Usuário Escola', value: 'school-user' },
  { title: 'Gestor Escola', value: 'school-manager' },
]
