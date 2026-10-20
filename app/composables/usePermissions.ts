import type { DemandRow } from '~/composables/useDemands'
import { ROLES } from '~/constants/roles'

/**
 * Composable centralizado para regras de permissão de domínio.
 */
export function usePermissions() {
  const { profile } = useProfile()
  const { userId } = useCurrentUserId()

  /**
   * Determina se o usuário logado tem permissão para editar uma demanda.
   * Regra: administrador ou o próprio criador da demanda.
   */
  const canEditDemand = (demand: Pick<DemandRow, 'user_id'> | null | undefined): boolean => {
    if (!demand) return false
    if (profile.value?.role === ROLES.ADMIN) return true

    const currentId = userId.value || profile.value?.id
    return !!currentId && demand.user_id === currentId
  }

  /**
   * Determina se o usuário logado tem permissão para excluir uma demanda.
   * Regra: administrador ou o próprio criador da demanda.
   */
  const canDeleteDemand = (demand: Pick<DemandRow, 'user_id'> | null | undefined): boolean => {
    if (!demand) return false
    if (profile.value?.role === ROLES.ADMIN) return true

    const currentId = userId.value || profile.value?.id
    return !!currentId && demand.user_id === currentId
  }

  /**
   * Determina se o usuário logado tem permissão para gerenciar (criar/editar) eleições.
   * Regra: admin, admin-election, manager-election ou user-election.
   */
  const canManageElections = (): boolean => {
    const role = profile.value?.role
    return (
      role === ROLES.ADMIN ||
      role === ROLES.ADMIN_ELECTION ||
      role === ROLES.MANAGER_ELECTION ||
      role === ROLES.USER_ELECTION
    )
  }

  /**
   * Determina se o usuário logado tem permissão para excluir eleições (safe delete).
   * Regra: admin ou admin-election.
   */
  const canDeleteElections = (): boolean => {
    const role = profile.value?.role
    return role === ROLES.ADMIN || role === ROLES.ADMIN_ELECTION
  }

  return {
    canEditDemand,
    canDeleteDemand,
    canManageElections,
    canDeleteElections,
  }
}
