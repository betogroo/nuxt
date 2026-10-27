<script setup lang="ts">
  import type { IconName } from '~/components/ui/icons'

  definePageMeta({
    middleware: ['admin'],
    icon: 'dashboard',
    navLabel: 'Painel Geral',
    navSubtitle: 'Métricas, configurações e auditoria',
    navColor: 'success',
    navGroup: 'admin',
    navOrder: 10,
    roles: ['admin'],
    showIn: ['drawer', 'home'],
  })

  useHead({ title: 'Painel de Administração - Geral' })

  const { fetchDashboardMetrics, getLogColor } = useAdminDashboard()
  const {
    data: metrics,
    pending,
    refresh: refreshMetrics,
  } = useAsyncData('admin-dashboard-metrics', fetchDashboardMetrics)

  const {
    pendingUnitsCount,
    pendingExpenseNaturesCount,
    pendingProductClassesCount,
    pendingCharacteristicKeysCount,
    pendingIirgdDocumentTypesCount,
    pendingReturnsCount,
    totalPending,
    refreshAll: refreshPendingTasks,
  } = usePendingTasks()

  const isRefreshing = ref(false)
  const searchQuery = ref('')
  const activeCategoryFilter = ref<'all' | 'catalog' | 'iirgd' | 'governance'>('all')

  const handleRefresh = async () => {
    isRefreshing.value = true
    try {
      await Promise.all([refreshMetrics(), refreshPendingTasks()])
    } finally {
      isRefreshing.value = false
    }
  }

  interface MetricCard {
    id: string
    label: string
    subtitle: string
    value: number | undefined
    icon: IconName
    color: string
    to: string
    highlight?: boolean
  }

  const metricCards = computed<MetricCard[]>(() => [
    {
      id: 'users',
      label: 'Usuários',
      subtitle: 'Perfis e acessos',
      value: metrics.value?.usersCount,
      icon: 'usersGroup',
      color: 'primary',
      to: APP_ROUTES.users,
    },
    {
      id: 'demands',
      label: 'Demandas Gerais',
      subtitle: 'Processos de compras',
      value: metrics.value?.demandsCount,
      icon: 'document',
      color: 'success',
      to: APP_ROUTES.demands.index,
    },
    {
      id: 'iirgd',
      label: 'Demandas IIRGD',
      subtitle: 'Identificação civil',
      value: metrics.value?.iirgdDemandsCount,
      icon: 'recordsList',
      color: 'deep-purple',
      to: APP_ROUTES.iirgd.index,
    },
    {
      id: 'products',
      label: 'Produtos Ativos',
      subtitle: 'Catálogo de materiais',
      value: metrics.value?.productsCount,
      icon: 'product',
      color: 'info',
      to: APP_ROUTES.products.index,
    },
    {
      id: 'suppliers',
      label: 'Fornecedores',
      subtitle: 'Empresas cadastradas',
      value: metrics.value?.suppliersCount,
      icon: 'company',
      color: 'indigo',
      to: APP_ROUTES.suppliers.index,
    },
    {
      id: 'pending',
      label: 'Tarefas Pendentes',
      subtitle: 'Revisão necessária',
      value: totalPending.value,
      icon: 'clipboardClock',
      color: totalPending.value > 0 ? 'warning' : 'default',
      to: '#central-pendencias',
      highlight: totalPending.value > 0,
    },
  ])

  interface AdminModule {
    id: string
    title: string
    description: string
    icon: IconName
    color: string
    to: string
    category: 'catalog' | 'iirgd' | 'governance'
    categoryLabel: string
    badge?: number
    badgeColor?: string
    badgeLabel?: string
    keywords: string[]
  }

  const allModules = computed<AdminModule[]>(() => [
    {
      id: 'units',
      title: 'Unidades de Medida',
      description: 'Gerenciamento de unidades padrão, abreviações e aliases do sistema.',
      icon: 'balance',
      color: 'warning',
      to: APP_ROUTES.admin.units,
      category: 'catalog',
      categoryLabel: 'Catálogo & Suprimentos',
      badge: pendingUnitsCount.value,
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
      badge: pendingExpenseNaturesCount.value,
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
      badge: pendingProductClassesCount.value,
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
      badge: pendingCharacteristicKeysCount.value,
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
      badge: pendingIirgdDocumentTypesCount.value,
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
      description: 'URL base do catálogo BEC e integrações externas.',
      icon: 'settings',
      color: 'blue-grey',
      to: APP_ROUTES.admin.settings,
      category: 'governance',
      categoryLabel: 'Governança & Segurança',
      keywords: ['configurações', 'bec', 'url', 'sistema', 'catálogo', 'parâmetros'],
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
  ])

  const filteredModules = computed<AdminModule[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return allModules.value.filter((m) => {
      const matchesCategory =
        activeCategoryFilter.value === 'all' || m.category === activeCategoryFilter.value

      if (!matchesCategory) return false
      if (!q) return true

      return (
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q) ||
        m.keywords.some((k) => k.toLowerCase().includes(q))
      )
    })
  })

  const clearSearch = () => {
    searchQuery.value = ''
    activeCategoryFilter.value = 'all'
  }
</script>

<template>
  <div class="admin-dashboard-page">
    <!-- Cabeçalho com Ações Rápidas -->
    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-4 mb-6">
      <UiPageHeader
        class="mb-0"
        subtitle="Métricas em tempo real e central unificada de configurações"
        title="Painel de Administração"
      />
      <div class="d-flex align-center gap-3 flex-wrap">
        <UiButton
          color="default"
          :loading="isRefreshing"
          prepend-icon="refresh"
          rounded="lg"
          size="sm"
          variant="outline"
          @click="handleRefresh"
        >
          Atualizar Dados
        </UiButton>
        <UiButton
          color="cyan"
          prepend-icon="backup"
          rounded="lg"
          size="sm"
          to="/admin/backup"
          variant="soft"
        >
          Backup & Restauração
        </UiButton>
      </div>
    </div>

    <!-- Estado de Carregamento Geral -->
    <div v-if="pending && !metrics" class="d-flex justify-center my-16">
      <div class="text-center">
        <UiProgressCircular class="mb-4" color="primary" indeterminate size="48" width="3" />
        <div class="text-body-2 text-medium-emphasis">Carregando painel de controle...</div>
      </div>
    </div>

    <template v-else-if="metrics">
      <!-- 1. Cards Principais de Indicadores (KPIs) -->
      <UiRow class="mb-6">
        <UiCol v-for="card in metricCards" :key="card.id" cols="12" lg="2" md="4" sm="6">
          <UiCard
            border
            class="kpi-card h-100"
            :class="{ 'kpi-card--highlight': card.highlight }"
            elevation="0"
            rounded="xl"
            :to="card.to"
          >
            <div class="d-flex flex-column justify-space-between h-100">
              <div class="d-flex align-center justify-space-between mb-3">
                <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                  {{ card.label }}
                </span>
                <UiAvatar :color="card.color" rounded="lg" size="38" variant="soft">
                  <UiIcon :name="card.icon" size="20" />
                </UiAvatar>
              </div>

              <div>
                <div class="text-h4 font-weight-black mb-1" :class="`text-${card.color}`">
                  <UiSkeletonLoader v-if="card.value === undefined" type="text" width="40" />
                  <span v-else>{{ card.value }}</span>
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ card.subtitle }}
                </div>
              </div>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- 2. Central de Pendências e Alertas Críticos -->
      <UiExpandTransition>
        <div v-if="totalPending > 0" id="central-pendencias" class="mb-6">
          <UiAlert
            border="start"
            color="warning"
            icon="clipboardClock"
            rounded="xl"
            title="Atenção: Itens Pendentes de Revisão Administrativa"
            variant="soft"
          >
            <div class="text-body-2 text-medium-emphasis mb-4">
              Existem registros aguardando aprovação ou retornos de demandas que necessitam de
              intervenção.
            </div>

            <UiRow class="ga-y-3">
              <!-- Unidades de Medida -->
              <UiCol v-if="pendingUnitsCount > 0" cols="12" md="4" sm="6">
                <div
                  class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface border"
                >
                  <div class="d-flex align-center gap-2">
                    <UiIcon color="warning" name="balance" size="18" />
                    <div>
                      <div class="text-caption font-weight-bold">Unidades de Medida</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ pendingUnitsCount }} {{ pendingUnitsCount === 1 ? 'item' : 'itens' }}
                      </div>
                    </div>
                  </div>
                  <UiButton color="warning" size="xs" to="/admin/units" variant="soft">
                    Revisar
                  </UiButton>
                </div>
              </UiCol>

              <!-- Naturezas de Despesa -->
              <UiCol v-if="pendingExpenseNaturesCount > 0" cols="12" md="4" sm="6">
                <div
                  class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface border"
                >
                  <div class="d-flex align-center gap-2">
                    <UiIcon color="orange" name="finances" size="18" />
                    <div>
                      <div class="text-caption font-weight-bold">Naturezas de Despesa</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ pendingExpenseNaturesCount }}
                        {{ pendingExpenseNaturesCount === 1 ? 'item' : 'itens' }}
                      </div>
                    </div>
                  </div>
                  <UiButton color="orange" size="xs" to="/admin/expense-natures" variant="soft">
                    Revisar
                  </UiButton>
                </div>
              </UiCol>

              <!-- Classes de Produtos -->
              <UiCol v-if="pendingProductClassesCount > 0" cols="12" md="4" sm="6">
                <div
                  class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface border"
                >
                  <div class="d-flex align-center gap-2">
                    <UiIcon color="teal" name="categories" size="18" />
                    <div>
                      <div class="text-caption font-weight-bold">Classes de Produtos</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ pendingProductClassesCount }}
                        {{ pendingProductClassesCount === 1 ? 'item' : 'itens' }}
                      </div>
                    </div>
                  </div>
                  <UiButton color="teal" size="xs" to="/admin/product-classes" variant="soft">
                    Revisar
                  </UiButton>
                </div>
              </UiCol>

              <!-- Tipos de Documento IIRGD -->
              <UiCol v-if="pendingIirgdDocumentTypesCount > 0" cols="12" md="4" sm="6">
                <div
                  class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface border"
                >
                  <div class="d-flex align-center gap-2">
                    <UiIcon color="deep-purple" name="document" size="18" />
                    <div>
                      <div class="text-caption font-weight-bold">Documentos IIRGD</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ pendingIirgdDocumentTypesCount }}
                        {{ pendingIirgdDocumentTypesCount === 1 ? 'tipo' : 'tipos' }}
                      </div>
                    </div>
                  </div>
                  <UiButton
                    color="deep-purple"
                    size="xs"
                    to="/admin/iirgd-document-types"
                    variant="soft"
                  >
                    Revisar
                  </UiButton>
                </div>
              </UiCol>

              <!-- Retornos Solicitados -->
              <UiCol v-if="pendingReturnsCount > 0" cols="12" md="8">
                <div class="pa-3 rounded-lg bg-surface border">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center gap-2">
                      <UiIcon color="warning" name="alert" size="18" />
                      <span class="text-caption font-weight-bold"
                        >Retornos de Status em Demandas</span
                      >
                    </div>
                    <UiChip color="warning" label size="xs"
                      >{{ pendingReturnsCount }} pendente(s)</UiChip
                    >
                  </div>
                  <div class="d-flex flex-column gap-2 mt-2">
                    <div
                      v-for="demand in metrics.pendingReturnDemands"
                      :key="demand.id"
                      class="d-flex align-center justify-space-between pa-2 rounded bg-background"
                    >
                      <div class="text-truncate mr-2">
                        <span class="text-body-2 font-weight-medium">{{ demand.name }}</span>
                        <span class="text-caption text-medium-emphasis ml-2"
                          >Status: {{ demand.status }}</span
                        >
                      </div>
                      <UiButton
                        color="primary"
                        size="xs"
                        :to="`/demands/${demand.id}`"
                        variant="soft"
                      >
                        Acessar
                      </UiButton>
                    </div>
                  </div>
                </div>
              </UiCol>
            </UiRow>
          </UiAlert>
        </div>
      </UiExpandTransition>

      <!-- 3. Central de Configurações e Módulos do Sistema -->
      <div class="mb-6">
        <UiCard elevation="0" rounded="xl">
          <template #header>
            <div
              class="d-flex flex-column flex-md-row align-md-center justify-space-between w-100 gap-3"
            >
              <div class="d-flex align-center gap-2">
                <UiAvatar color="primary" rounded="lg" size="36" variant="soft">
                  <UiIcon name="settings" size="20" />
                </UiAvatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">
                    Central de Configurações & Módulos
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Acesso direto e simplificado a todos os recursos administrativos
                  </div>
                </div>
              </div>

              <!-- Filtros e Busca Rápida -->
              <div
                class="d-flex align-center gap-2 flex-wrap"
                style="min-width: 300px; max-width: 500px"
              >
                <div class="flex-grow-1">
                  <UiInput
                    v-model="searchQuery"
                    clearable
                    density="compact"
                    hide-details
                    label="Buscar configuração ou módulo..."
                    placeholder="ex: unidades, sla, backup, fornecedores"
                    prepend-inner-icon="search"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- Filtros de Categoria em Chips -->
          <div class="d-flex align-center gap-2 mb-5 flex-wrap">
            <span class="text-caption font-weight-medium text-medium-emphasis mr-1"
              >Filtrar por:</span
            >
            <UiChip
              :color="activeCategoryFilter === 'all' ? 'primary' : 'default'"
              filter
              label
              size="sm"
              :variant="activeCategoryFilter === 'all' ? 'solid' : 'soft'"
              @click="activeCategoryFilter = 'all'"
            >
              Todos ({{ allModules.length }})
            </UiChip>
            <UiChip
              :color="activeCategoryFilter === 'catalog' ? 'primary' : 'default'"
              filter
              label
              size="sm"
              :variant="activeCategoryFilter === 'catalog' ? 'solid' : 'soft'"
              @click="activeCategoryFilter = 'catalog'"
            >
              Catálogo & Suprimentos
            </UiChip>
            <UiChip
              :color="activeCategoryFilter === 'iirgd' ? 'primary' : 'default'"
              filter
              label
              size="sm"
              :variant="activeCategoryFilter === 'iirgd' ? 'solid' : 'soft'"
              @click="activeCategoryFilter = 'iirgd'"
            >
              Módulo IIRGD
            </UiChip>
            <UiChip
              :color="activeCategoryFilter === 'governance' ? 'primary' : 'default'"
              filter
              label
              size="sm"
              :variant="activeCategoryFilter === 'governance' ? 'solid' : 'soft'"
              @click="activeCategoryFilter = 'governance'"
            >
              Governança & Segurança
            </UiChip>
          </div>

          <!-- Grade de Módulos Dinâmica -->
          <UiRow v-if="filteredModules.length > 0">
            <UiCol v-for="mod in filteredModules" :key="mod.id" cols="12" lg="4" md="6">
              <UiCard border class="module-card h-100" elevation="0" rounded="xl" :to="mod.to">
                <div class="d-flex flex-column justify-space-between h-100">
                  <div>
                    <div class="d-flex align-center justify-space-between mb-3">
                      <UiAvatar :color="mod.color" rounded="lg" size="44" variant="soft">
                        <UiIcon :name="mod.icon" size="22" />
                      </UiAvatar>
                      <div class="d-flex align-center gap-2">
                        <UiChip
                          v-if="mod.badge && mod.badge > 0"
                          :color="mod.badgeColor || 'warning'"
                          label
                          size="xs"
                        >
                          {{ mod.badge }} {{ mod.badgeLabel || 'pendências' }}
                        </UiChip>
                        <UiChip color="default" label size="xs" variant="soft">
                          {{ mod.categoryLabel }}
                        </UiChip>
                      </div>
                    </div>

                    <div class="text-subtitle-1 font-weight-bold mb-1 text-high-emphasis">
                      {{ mod.title }}
                    </div>
                    <div class="text-body-2 text-medium-emphasis mb-4">
                      {{ mod.description }}
                    </div>
                  </div>

                  <div class="d-flex align-center justify-space-between pt-2 border-top">
                    <span class="text-caption font-weight-medium text-primary">
                      Acessar configuração
                    </span>
                    <UiIcon color="primary" name="next" size="16" />
                  </div>
                </div>
              </UiCard>
            </UiCol>
          </UiRow>

          <!-- Estado Vazio quando a busca não encontra nada -->
          <div v-else class="text-center py-12">
            <UiAvatar class="mb-3" color="default" rounded="circle" size="56" variant="soft">
              <UiIcon name="search" size="28" />
            </UiAvatar>
            <div class="text-subtitle-1 font-weight-bold mb-1">Nenhuma configuração encontrada</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Não encontramos nenhum módulo para o termo "{{ searchQuery }}".
            </div>
            <UiButton color="primary" size="sm" variant="soft" @click="clearSearch">
              Limpar Filtros
            </UiButton>
          </div>
        </UiCard>
      </div>

      <!-- 4. Atividade Recente e Histórico de Auditoria -->
      <UiRow>
        <UiCol cols="12">
          <UiCard elevation="0" rounded="xl">
            <template #header>
              <div class="d-flex align-center justify-space-between w-100">
                <div class="d-flex align-center gap-2">
                  <UiAvatar color="primary" rounded="lg" size="36" variant="soft">
                    <UiIcon name="history" size="20" />
                  </UiAvatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">
                      Atividade Recente & Auditoria
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Registro das últimas operações realizadas no sistema
                    </div>
                  </div>
                </div>
                <UiButton color="primary" prepend-icon="next" size="sm" to="/logs" variant="ghost">
                  Ver Histórico Completo
                </UiButton>
              </div>
            </template>

            <div v-if="metrics.recentLogs.length > 0">
              <UiTimeline align="start" size="sm" truncate-line="both">
                <UiTimelineItem
                  v-for="log in metrics.recentLogs"
                  :key="log.id"
                  :dot-color="getLogColor(log.action)"
                  size="xs"
                >
                  <div class="pb-3">
                    <div class="d-flex align-center gap-2 mb-1 flex-wrap">
                      <span class="text-body-2 font-weight-semibold">
                        {{ log.action.replace(/_/g, ' ') }}
                      </span>
                      <UiChip color="default" label size="xs" variant="soft">
                        {{ log.profiles?.name || 'Sistema' }}
                      </UiChip>
                      <span class="text-caption text-medium-emphasis ml-auto">
                        {{ formatDateTime(log.created_at) }}
                      </span>
                    </div>
                    <div class="text-body-2 text-medium-emphasis">{{ log.description }}</div>
                  </div>
                </UiTimelineItem>
              </UiTimeline>
            </div>

            <div v-else class="d-flex flex-column align-center py-10 text-medium-emphasis">
              <UiIcon class="mb-2" name="history" size="36" />
              <span class="text-body-2">Nenhuma atividade registrada recentemente.</span>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
    </template>
  </div>
</template>

<style scoped>
  .kpi-card {
    transition:
      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-decoration: none;
    border: 1px solid rgba(var(--v-border-color), 0.1);
  }
  .kpi-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
  }
  .kpi-card--highlight {
    border-color: rgba(var(--v-theme-warning), 0.4) !important;
    background-color: rgba(var(--v-theme-warning), 0.02) !important;
  }

  .module-card {
    transition:
      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      border-color 0.2s;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid rgba(var(--v-border-color), 0.1);
  }
  .module-card:hover {
    transform: translateY(-3px);
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
  }

  .border-top {
    border-top: 1px solid rgba(var(--v-border-color), 0.08);
  }
</style>
