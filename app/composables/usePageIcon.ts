export const usePageIcon = () => {
  const router = useRouter()

  const getIcon = (path: string): string => {
    if (!router) return 'circle'
    const route = router.getRoutes().find((r) => r.path === path || r.path === path + '/')
    return (route?.meta?.icon as string) || 'circle'
  }

  return {
    getIcon,
  }
}
