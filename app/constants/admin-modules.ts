import type { IconName } from '~/components/ui/icons'
import { APP_ROUTES } from '~/utils/routes'

export type AdminModuleCategory = 'catalog' | 'iirgd' | 'governance'

export interface MetricCard {
  id: string
  label: string
  subtitle: string
  value: number | undefined
  icon: IconName
  color: string
  to: string
  highlight?: boolean
}

export interface AdminModule {
  id: string
  title: string
  description: string
  icon: IconName
  color: string
  to: string
  category: AdminModuleCategory
  categoryLabel: string
  badge?: number
  badgeColor?: string
  badgeLabel?: string
  keywords: string[]
}

export interface AdminDashboardCounts {
  usersCount?: number
  demandsCount?: number
  iirgdDemandsCount?: number
  productsCount?: number
  suppliersCount?: number
}

export interface AdminPendingBadges {
  pendingUnitsCount: number
  pendingExpenseNaturesCount: number
  pendingProductClassesCount: number
  pendingCharacteristicKeysCount: number
  pendingIirgdDocumentTypesCount: number
}

export function buildAdminMetricCards(
  metrics: AdminDashboardCounts | null | undefined,
  totalPending: number,
): MetricCard[] {
  return [
    {
      id: 'users',
      label: 'Usuários',
      subtitle: 'Perfis e acessos',
      value: metrics?.usersCount,
      icon: 'usersGroup',
      color: 'primary',
      to: APP_ROUTES.users,
    },
    {
      id: 'demands',
      label: 'Demandas Gerais',
      subtitle: 'Processos de compras',
      value: metrics?.demandsCount,
      icon: 'document',
      color: 'success',
      to: APP_ROUTES.demands.index,
    },
    {
      id: 'iirgd',
      label: 'Demandas IIRGD',
      subtitle: 'Identificação civil',
      value: metrics?.iirgdDemandsCount,
      icon: 'recordsList',
      color: 'deep-purple',
      to: APP_ROUTES.iirgd.index,
    },
    {
      id: 'products',
      label: 'Produtos Ativos',
      subtitle: 'Catálogo de materiais',
      value: metrics?.productsCount,
      icon: 'product',
      color: 'info',
      to: APP_ROUTES.products.index,
    },
    {
      id: 'suppliers',
      label: 'Fornecedores',
      subtitle: 'Empresas cadastradas',
      value: metrics?.suppliersCount,
      icon: 'company',
      color: 'indigo',
      to: APP_ROUTES.suppliers.index,
    },
    {
      id: 'pending',
      label: 'Tarefas Pendentes',
      subtitle: 'Revisão necessária',
      value: totalPending,
      icon: 'clipboardClock',
      color: totalPending > 0 ? 'warning' : 'default',
      to: '#central-pendencias',
      highlight: totalPending > 0,
    },
  ]
}

export function buildAdminModules(badges: AdminPendingBadges): AdminModule[] {
  return [
    {
      id: 'units',
      title: 'Unidades de Medida',
      description: 'Gerenciamento de unidades padrão, abreviações e aliases do sistema.',
      icon: 'balance',
      color: 'warning',
      to: APP_ROUTES.admin.units,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      badge: badges.pendingUnitsCount,
      badgeColor: 'warning',
      badgeLabel: 'Pendentes',
      keywords: ['unidades', 'medida', 'alias', 'abreviação', 'kg', 'metro', 'litro'],
    },
    {
      id: 'expense-natures',
      title: 'Naturezas de Despesa',
      description: 'Classificação orçamentária e códigos de despesas para aquisições.',
      icon: 'finances',
      color: 'orange',
      to: APP_ROUTES.admin.expenseNatures,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      badge: badges.pendingExpenseNaturesCount,
      badgeColor: 'orange',
      badgeLabel: 'Pendentes',
      keywords: ['despesa', 'natureza', 'orçamento', 'financeiro', 'código', 'gasto'],
    },
    {
      id: 'product-classes',
      title: 'Classes de Produtos',
      description: 'Categorização de materiais e itens permanentes ou de consumo.',
      icon: 'categories',
      color: 'teal',
      to: APP_ROUTES.admin.productClasses,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      badge: badges.pendingProductClassesCount,
      badgeColor: 'teal',
      badgeLabel: 'Pendentes',
      keywords: ['classe', 'produtos', 'categoria', 'material', 'consumo', 'permanente'],
    },
    {
      id: 'product-characteristics',
      title: 'Características de Produtos',
      description: 'Padronize e unifique chaves de características e especificações técnicas.',
      icon: 'categories',
      color: 'teal',
      to: APP_ROUTES.admin.productCharacteristics,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      badge: badges.pendingCharacteristicKeysCount,
      badgeColor: 'teal',
      badgeLabel: 'Pendentes',
      keywords: [
        'características',
        'especificações',
        'chaves',
        'valores',
        'detalhes',
        'propriedades',
      ],
    },
    {
      id: 'class-spending',
      title: 'Gastos Anuais por Classe',
      description:
        'Cálculo de gasto acumulado, teto anual e saldo disponível por classe de produtos.',
      icon: 'finances',
      color: 'teal',
      to: APP_ROUTES.demands.classSpending,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      keywords: ['teto', 'classe', 'gasto', 'anual', 'saldo', 'empenho', 'dispensa', 'relatório'],
    },
    {
      id: 'suppliers',
      title: 'Fornecedores',
      description: 'Cadastro de fornecedores parceiros, CNPJ e contatos para cotações.',
      icon: 'company',
      color: 'indigo',
      to: APP_ROUTES.suppliers.index,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      keywords: ['fornecedores', 'empresas', 'cnpj', 'cotação', 'propostas', 'parceiros'],
    },
    {
      id: 'iirgd-doc-types',
      title: 'Tipos de Documento IIRGD',
      description: 'Tipos de certidões e documentos exigidos na emissão de RG.',
      icon: 'document',
      color: 'deep-purple',
      to: APP_ROUTES.admin.iirgdDocumentTypes,
      category: 'iirgd',
      categoryLabel: 'Módulo IIRGD',
      badge: badges.pendingIirgdDocumentTypesCount,
      badgeColor: 'deep-purple',
      badgeLabel: 'Pendentes',
      keywords: ['iirgd', 'documentos', 'rg', 'certidão', 'nascimento', 'casamento'],
    },
    {
      id: 'iirgd-settings',
      title: 'SLA & Prazos IIRGD',
      description: 'Definição de tempos de alerta, prioridades e limites de atendimento.',
      icon: 'settings',
      color: 'amber',
      to: APP_ROUTES.admin.iirgdSettings,
      category: 'iirgd',
      categoryLabel: 'Módulo IIRGD',
      keywords: ['sla', 'prazos', 'iirgd', 'alerta', 'dias', 'prioridade', 'configuração'],
    },
    {
      id: 'iirgd-reports',
      title: 'Relatórios do IIRGD',
      description: 'Painel analítico, estatísticas e relatórios operacionais consolidados.',
      icon: 'chart',
      color: 'purple',
      to: APP_ROUTES.iirgd.reports,
      category: 'iirgd',
      categoryLabel: 'Módulo IIRGD',
      keywords: ['relatórios', 'iirgd', 'estatísticas', 'gráficos', 'métricas', 'produtividade'],
    },
    {
      id: 'users',
      title: 'Usuários & Permissões',
      description: 'Controle de contas de acesso, perfis funcionais e papéis administrativos.',
      icon: 'usersGroup',
      color: 'primary',
      to: APP_ROUTES.users,
      category: 'governance',
      categoryLabel: 'Governança & Segurança',
      keywords: ['usuários', 'perfis', 'permissões', 'admin', 'acesso', 'contas', 'senhas'],
    },
    {
      id: 'backup',
      title: 'Backup & Restauração',
      description: 'Exportação completa e recuperação transacional dos dados do sistema.',
      icon: 'backup',
      color: 'cyan',
      to: APP_ROUTES.admin.backup,
      category: 'governance',
      categoryLabel: 'Governança & Segurança',
      keywords: [
        'backup',
        'restauração',
        'restaurar',
        'exportar',
        'download',
        'segurança',
        'banco',
      ],
    },
    {
      id: 'system-settings',
      title: 'Configurações do Sistema',
      description:
        'Teto anual por classe de produtos, URL base do catálogo BEC e parâmetros globais.',
      icon: 'settings',
      color: 'blue-grey',
      to: APP_ROUTES.admin.settings,
      category: 'governance',
      categoryLabel: 'Governança & Segurança',
      keywords: [
        'configurações',
        'bec',
        'url',
        'sistema',
        'catálogo',
        'parâmetros',
        'teto',
        'classe',
        'anual',
      ],
    },
    {
      id: 'logs',
      title: 'Trilha de Auditoria',
      description: 'Histórico detalhado de alterações, eventos e rastreabilidade operacional.',
      icon: 'history',
      color: 'blue-grey',
      to: APP_ROUTES.logs,
      category: 'governance',
      categoryLabel: 'Governança & Segurança',
      keywords: ['logs', 'auditoria', 'histórico', 'rastreabilidade', 'eventos', 'ações'],
    },
  ]
}
