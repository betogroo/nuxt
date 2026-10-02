<script setup lang="ts">
  definePageMeta({
    middleware: ['admin'],
    icon: 'dashboard',
    navLabel: 'Painel Admin',
    navSubtitle: 'Métricas e atividade do sistema',
    navColor: 'success',
    navGroup: 'admin',
    navOrder: 50,
    roles: ['admin'],
    showIn: ['drawer', 'home'],
  })
  useHead({ title: 'Painel de Controle - Admin' })

  const { fetchDashboardMetrics, getLogColor } = useAdminDashboard()

  const { data: metrics, pending } = useAsyncData('admin-dashboard-metrics', fetchDashboardMetrics)

  const {
    pendingUnitsCount,
    pendingExpenseNaturesCount,
    pendingProductClassesCount,
    totalPending,
  } = usePendingTasks()

  // Formatters
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  interface MetricCard {
    label: string
    value: number | undefined
    icon: string
    color: string
    to: string
  }

  const { getIcon } = usePageIcon()
  const { adminShortcuts } = useNavLinks()

  const metricCards = computed<MetricCard[]>(() => [
    {
      label: 'Usuários',
      value: metrics.value?.usersCount,
      icon: getIcon('/users'),
      color: 'primary',
      to: '/users',
    },
    {
      label: 'Demandas',
      value: metrics.value?.demandsCount,
      icon: getIcon('/demands'),
      color: 'success',
      to: '/demands',
    },
    {
      label: 'Produtos Ativos',
      value: metrics.value?.productsCount,
      icon: getIcon('/products'),
      color: 'info',
      to: '/products',
    },
  ])
</script>

<template>
  <div>
    <PageHeader subtitle="Resumo e estatísticas do sistema" title="Painel de Controle" />

    <!-- Loading state -->
    <div v-if="pending" class="d-flex justify-center my-16">
      <div class="text-center">
        <v-progress-circular class="mb-4" color="primary" indeterminate size="48" width="3" />
        <div class="text-body-2 text-medium-emphasis">Carregando dados...</div>
      </div>
    </div>

    <template v-else-if="metrics">
      <!-- Métricas principais -->
      <v-row class="mb-6">
        <v-col v-for="card in metricCards" :key="card.label" cols="12" md="3" sm="6">
          <v-card border class="metric-card" elevation="0" rounded="xl" :to="card.to">
            <v-card-text class="d-flex align-center justify-space-between pa-5">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1">
                  {{ card.label }}
                </div>
                <div class="text-h4 font-weight-black" :class="`text-${card.color}`">
                  <v-skeleton-loader v-if="card.value === undefined" type="text" width="40" />
                  <span v-else>{{ card.value }}</span>
                </div>
              </div>
              <v-avatar :color="card.color" rounded="lg" size="52" variant="tonal">
                <UiIcon :name="card.icon" size="26" />
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Alerta de Pendências -->
      <v-expand-transition>
        <div v-if="totalPending > 0" class="mb-6">
          <v-alert
            border="start"
            color="warning"
            density="compact"
            icon="mdi-clipboard-text-clock-outline"
            rounded="xl"
            title="Tarefas Pendentes de Revisão"
            variant="tonal"
          >
            <div class="d-flex flex-column gap-3 mt-3">
              <!-- Unidades -->
              <div v-if="pendingUnitsCount > 0" class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-2">
                  <UiIcon color="warning" name="balance" size="18" />
                  <span class="text-body-2">
                    Unidades de Medida Pendentes
                    <v-chip class="ml-1" color="warning" label size="x-small">
                      {{ pendingUnitsCount }}
                    </v-chip>
                  </span>
                </div>
                <UiButton color="warning" size="small" to="/admin/units" variant="tonal">
                  Revisar
                </UiButton>
              </div>

              <v-divider
                v-if="
                  pendingUnitsCount > 0 &&
                  (pendingExpenseNaturesCount > 0 ||
                    pendingProductClassesCount > 0 ||
                    metrics.pendingReturnDemands.length > 0)
                "
              />

              <!-- Naturezas de Despesa -->
              <div
                v-if="pendingExpenseNaturesCount > 0"
                class="d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center gap-2">
                  <UiIcon color="warning" name="finances" size="18" />
                  <span class="text-body-2">
                    Naturezas de Despesa Pendentes
                    <v-chip class="ml-1" color="warning" label size="x-small">
                      {{ pendingExpenseNaturesCount }}
                    </v-chip>
                  </span>
                </div>
                <UiButton color="warning" size="small" to="/admin/expense-natures" variant="tonal">
                  Revisar
                </UiButton>
              </div>

              <v-divider
                v-if="
                  pendingExpenseNaturesCount > 0 &&
                  (pendingProductClassesCount > 0 || metrics.pendingReturnDemands.length > 0)
                "
              />

              <!-- Classes de Produtos -->
              <div
                v-if="pendingProductClassesCount > 0"
                class="d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center gap-2">
                  <UiIcon color="warning" name="categories" size="18" />
                  <span class="text-body-2">
                    Classes de Produtos Pendentes
                    <v-chip class="ml-1" color="warning" label size="x-small">
                      {{ pendingProductClassesCount }}
                    </v-chip>
                  </span>
                </div>
                <UiButton color="warning" size="small" to="/admin/product-classes" variant="tonal">
                  Revisar
                </UiButton>
              </div>

              <v-divider
                v-if="pendingProductClassesCount > 0 && metrics.pendingReturnDemands.length > 0"
              />

              <!-- Retornos de demandas -->
              <div v-if="metrics.pendingReturnDemands.length > 0">
                <div class="d-flex align-center gap-2 mb-2">
                  <UiIcon color="warning" name="back" size="18" />
                  <span class="text-body-2 font-weight-medium">
                    Retornos de Status em Demandas
                    <v-chip class="ml-1" color="warning" label size="x-small">
                      {{ metrics.pendingReturnDemands.length }}
                    </v-chip>
                  </span>
                </div>
                <div class="d-flex flex-column gap-2">
                  <div
                    v-for="demand in metrics.pendingReturnDemands"
                    :key="demand.id"
                    class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface"
                  >
                    <div>
                      <div class="text-body-2 font-weight-medium">{{ demand.name }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Status atual: {{ demand.status }}
                      </div>
                    </div>
                    <UiButton
                      color="primary"
                      size="small"
                      :to="`/demands/${demand.id}`"
                      variant="tonal"
                    >
                      Acessar
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>
          </v-alert>
        </div>
      </v-expand-transition>

      <v-row>
        <!-- Atividade Recente -->
        <v-col cols="12" md="8">
          <UiCard class="h-100">
            <template #header>
              <UiIcon class="mr-2" color="primary" name="history" />
              Atividade Recente
              <v-spacer />
              <UiButton color="primary" size="small" to="/logs" variant="text">
                Ver todos
                <UiIcon end name="next" size="16" />
              </UiButton>
            </template>

            <div v-if="metrics.recentLogs.length">
              <v-timeline align="start" density="compact" truncate-line="both">
                <v-timeline-item
                  v-for="log in metrics.recentLogs"
                  :key="log.id"
                  :dot-color="getLogColor(log.action)"
                  size="x-small"
                >
                  <div class="pb-3">
                    <div class="d-flex align-center gap-2 mb-1">
                      <span class="text-body-2 font-weight-semibold">
                        {{ log.action.replace(/_/g, ' ') }}
                      </span>
                      <v-chip color="default" label size="x-small" variant="tonal">
                        {{ log.profiles?.name || 'Sistema' }}
                      </v-chip>
                    </div>
                    <div class="text-body-2 text-medium-emphasis mb-1">{{ log.description }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatDate(log.created_at) }}
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </div>

            <div v-else class="d-flex flex-column align-center py-10 text-medium-emphasis">
              <UiIcon class="mb-2" name="history" size="36" />
              <span class="text-body-2">Nenhuma atividade registrada ainda.</span>
            </div>
          </UiCard>
        </v-col>

        <!-- Acesso Rápido -->
        <v-col cols="12" md="4">
          <UiCard class="h-100">
            <template #header>
              <UiIcon class="mr-2" color="primary" name="energy" />
              Acesso Rápido
            </template>

            <div class="d-flex flex-column gap-2">
              <v-btn
                v-for="shortcut in adminShortcuts"
                :key="shortcut.path"
                block
                class="justify-start mb-1"
                :color="shortcut.color"
                :prepend-icon="shortcut.icon"
                rounded="lg"
                size="large"
                :to="shortcut.path"
                variant="tonal"
              >
                {{ shortcut.label }}
              </v-btn>
            </div>
          </UiCard>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
  .metric-card {
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;
    text-decoration: none;
  }
  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08) !important;
  }
</style>
