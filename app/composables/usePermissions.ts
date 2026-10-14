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

  return {
    canEditDemand,
  }
}
