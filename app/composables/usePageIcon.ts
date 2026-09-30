export const usePageIcon = () => {
  const router = useRouter()

  const getIcon = (path: string): string => {
    if (!router) return 'mdi-circle-outline'
    const route = router.getRoutes().find((r) => r.path === path || r.path === path + '/')
    return (route?.meta?.icon as string) || 'mdi-circle-outline'
  }

  return {
    getIcon,
  }
}
