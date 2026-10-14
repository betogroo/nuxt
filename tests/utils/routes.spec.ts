import { describe, it, expect } from 'vitest'
import { APP_ROUTES } from '../../app/utils/routes'

describe('utils/routes', () => {
  it('contains correct static route definitions', () => {
    expect(APP_ROUTES.home).toBe('/')
    expect(APP_ROUTES.login).toBe('/login')
    expect(APP_ROUTES.register).toBe('/register')
    expect(APP_ROUTES.users).toBe('/users')
    expect(APP_ROUTES.demands.index).toBe('/demands')
    expect(APP_ROUTES.suppliers.index).toBe('/suppliers')
    expect(APP_ROUTES.products.index).toBe('/products')
    expect(APP_ROUTES.admin.index).toBe('/admin')
    expect(APP_ROUTES.admin.backup).toBe('/admin/backup')
    expect(APP_ROUTES.iirgd.index).toBe('/iirgd')
    expect(APP_ROUTES.iirgd.reports).toBe('/iirgd/reports')
  })

  it('correctly constructs dynamic route paths', () => {
    expect(APP_ROUTES.demands.detail('d-123')).toBe('/demands/d-123')
    expect(APP_ROUTES.demands.item('d-123', 'i-456')).toBe('/demands/d-123/items/i-456')
    expect(APP_ROUTES.demands.supplier('d-123', 's-789')).toBe('/demands/d-123/suppliers/s-789')
    expect(APP_ROUTES.suppliers.detail('s-123')).toBe('/suppliers/s-123')
    expect(APP_ROUTES.products.detail('p-123')).toBe('/products/p-123')
    expect(APP_ROUTES.iirgd.detail('igd-123')).toBe('/iirgd/igd-123')
    expect(APP_ROUTES.iirgd.citizenDetail('cit-123')).toBe('/iirgd/citizens/cit-123')
    expect(APP_ROUTES.iirgd.statusGroup('in-progress')).toBe('/iirgd/status/in-progress')
  })
})
