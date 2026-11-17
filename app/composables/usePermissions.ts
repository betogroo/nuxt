import { computed } from 'vue'
import type { DemandRow } from '~/composables/useDemands'
import { ROLES } from '~/constants/roles'

export interface DemandResponsibleEntry {
  user_id?: string | null
}

export interface DemandPermissionEntity {
  user_id?: string | null
  demand_responsibles?: DemandResponsibleEntry[] | null
}

/**
 * Composable centralizado para regras de permissão de domínio.
 */
export function usePermissions() {
  const { profile } = useProfile()
  const { userId } = useCurrentUserId()

  const isAdmin = computed(() => profile.value?.role === ROLES.ADMIN)
  const isIirgdUser = computed(() => profile.value?.role === ROLES.IIRGD_USER)

  /**
   * Determina se o usuário logado tem perfil de gestão no módulo IIRGD (admin ou iirgd_manager).
   */
  const canManageIirgd = computed(
    () => profile.value?.role === ROLES.ADMIN || profile.value?.role === ROLES.IIRGD_MANAGER,
  )

  /**
   * Determina se o usuário logado pode editar status na listagem do IIRGD.
   */
  const canEditIirgdStatus = computed(() => profile.value?.role !== ROLES.IIRGD_USER)

  const isOwnerOrAdmin = (entity: Pick<DemandRow, 'user_id'> | null | undefined): boolean => {
    if (!entity) return false
    if (isAdmin.value) return true

    const currentId = userId.value || profile.value?.id
    return !!currentId && entity.user_id === currentId
  }

  const isResponsibleForDemand = (
    demand: DemandPermissionEntity | null | undefined,
    externalResponsibles?: Array<DemandResponsibleEntry | null> | null,
  ): boolean => {
    const currentId = userId.value || profile.value?.id
    if (!currentId) return false

    const responsiblesList = externalResponsibles ?? demand?.demand_responsibles
    if (!Array.isArray(responsiblesList)) return false

    return responsiblesList.some((r) => r?.user_id === currentId)
  }

  /**
   * Determina se o usuário logado tem permissão para trabalhar/editar uma demanda.
   * Regra: administrador, o próprio criador da demanda ou um dos responsáveis vinculados à demanda.
   */
  const canEditDemand = (
    demand: DemandPermissionEntity | null | undefined,
    externalResponsibles?: Array<DemandResponsibleEntry | null> | null,
  ): boolean => {
    if (!demand) return false
    if (isOwnerOrAdmin(demand as Pick<DemandRow, 'user_id'>)) return true
    return isResponsibleForDemand(demand, externalResponsibles)
  }

  /**
   * Determina se o usuário logado tem permissão para excluir uma demanda.
   * Regra: administrador ou o próprio criador da demanda.
   */
  const canDeleteDemand = (demand: Pick<DemandRow, 'user_id'> | null | undefined): boolean =>
    isOwnerOrAdmin(demand)

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
    isAdmin,
    isIirgdUser,
    canManageIirgd,
    canEditIirgdStatus,
    canEditDemand,
    canDeleteDemand,
    canManageElections,
    canDeleteElections,
  }
}
