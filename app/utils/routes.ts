/**
 * Mapeamento centralizado e fortemente tipado das rotas da aplicação.
 * Em conformidade com a convenção do projeto, todos os identificadores e rotas estão em inglês.
 */

export const APP_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  confirm: '/confirm',
  about: '/about',
  profile: '/profile',
  users: '/users',
  logs: '/logs',

  demands: {
    index: '/demands',
    detail: (id: string) => `/demands/${id}`,
    item: (demandId: string, itemId: string) => `/demands/${demandId}/items/${itemId}`,
    supplier: (demandId: string, supplierId: string) =>
      `/demands/${demandId}/suppliers/${supplierId}`,
  },

  suppliers: {
    index: '/suppliers',
    detail: (id: string) => `/suppliers/${id}`,
  },

  products: {
    index: '/products',
    detail: (id: string) => `/products/${id}`,
  },

  admin: {
    index: '/admin',
    units: '/admin/units',
    expenseNatures: '/admin/expense-natures',
    productClasses: '/admin/product-classes',
    backup: '/admin/backup',
    iirgdSettings: '/admin/iirgd-settings',
    iirgdDocumentTypes: '/admin/iirgd-document-types',
    settings: '/admin/settings',
  },

  iirgd: {
    index: '/iirgd',
    detail: (id: string) => `/iirgd/${id}`,
    reports: '/iirgd/reports',
    citizens: '/iirgd/citizens',
    citizenDetail: (id: string) => `/iirgd/citizens/${id}`,
    statusGroup: (group: string) => `/iirgd/status/${group}`,
  },
} as const
