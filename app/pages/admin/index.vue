<script setup lang="ts">
  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Painel de Controle - Admin' })

  const { fetchDashboardMetrics, getLogColor } = useAdminDashboard()

  const { data: metrics, pending } = useAsyncData('admin-dashboard-metrics', fetchDashboardMetrics)

  const { pendingCategoriesCount, pendingUnitsCount, totalPending } = usePendingTasks()

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

  const metricCards = computed<MetricCard[]>(() => [
    {
      label: 'Usuários',
      value: metrics.value?.usersCount,
      icon: 'mdi-account-group-outline',
      color: 'primary',
      to: '/users',
    },
    {
      label: 'Demandas',
      value: metrics.value?.demandsCount,
      icon: 'mdi-clipboard-list-outline',
      color: 'success',
      to: '/demands',
    },
    {
      label: 'Produtos Ativos',
      value: metrics.value?.productsCount,
      icon: 'mdi-package-variant-outline',
      color: 'info',
      to: '/products',
    },
    {
      label: 'Categorias',
      value: metrics.value?.categoriesCount,
      icon: 'mdi-shape-outline',
      color: 'deep-purple',
      to: '/admin',
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
                <v-icon :icon="card.icon" size="26" />
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
              <!-- Categorias -->
              <div
                v-if="pendingCategoriesCount > 0"
                class="d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon color="warning" icon="mdi-shape-outline" size="18" />
                  <span class="text-body-2">
                    Categorias Sugeridas
                    <v-chip class="ml-1" color="warning" label size="x-small">
                      {{ pendingCategoriesCount }}
                    </v-chip>
                  </span>
                </div>
                <UiButton color="warning" size="small" to="/admin/categories" variant="tonal">
                  Revisar
                </UiButton>
              </div>

              <v-divider v-if="pendingCategoriesCount > 0 && pendingUnitsCount > 0" />

              <!-- Unidades -->
              <div v-if="pendingUnitsCount > 0" class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-2">
                  <v-icon color="warning" icon="mdi-scale-balance" size="18" />
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
                  (pendingCategoriesCount > 0 || pendingUnitsCount > 0) &&
                  metrics.pendingReturnDemands.length > 0
                "
              />

              <!-- Retornos de demandas -->
              <div v-if="metrics.pendingReturnDemands.length > 0">
                <div class="d-flex align-center gap-2 mb-2">
                  <v-icon color="warning" icon="mdi-keyboard-return" size="18" />
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
              <v-icon class="mr-2" color="primary" icon="mdi-history" />
              Atividade Recente
              <v-spacer />
              <UiButton color="primary" size="small" to="/logs" variant="text">
                Ver todos
                <v-icon end size="16">mdi-arrow-right</v-icon>
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
              <v-icon class="mb-2" icon="mdi-history" size="36" />
              <span class="text-body-2">Nenhuma atividade registrada ainda.</span>
            </div>
          </UiCard>
        </v-col>

        <!-- Acesso Rápido -->
        <v-col cols="12" md="4">
          <UiCard class="h-100">
            <template #header>
              <v-icon class="mr-2" color="primary" icon="mdi-lightning-bolt-outline" />
              Acesso Rápido
            </template>

            <div class="d-flex flex-column gap-2">
              <v-btn
                block
                class="justify-start"
                color="primary"
                prepend-icon="mdi-account-group-outline"
                rounded="lg"
                size="large"
                to="/users"
                variant="tonal"
              >
                Gerenciar Usuários
              </v-btn>

              <v-btn
                block
                class="justify-start"
                color="deep-purple"
                prepend-icon="mdi-shape-outline"
                rounded="lg"
                size="large"
                to="/admin/categories"
                variant="tonal"
              >
                Categorias de Produtos
              </v-btn>

              <v-btn
                block
                class="justify-start"
                color="info"
                prepend-icon="mdi-package-variant-outline"
                rounded="lg"
                size="large"
                to="/products"
                variant="tonal"
              >
                Ver Produtos
              </v-btn>

              <v-btn
                block
                class="justify-start"
                color="blue-grey"
                prepend-icon="mdi-text-box-search-outline"
                rounded="lg"
                size="large"
                to="/logs"
                variant="tonal"
              >
                Auditoria de Logs
              </v-btn>

              <v-btn
                block
                class="justify-start"
                color="warning"
                prepend-icon="mdi-scale-balance"
                rounded="lg"
                size="large"
                to="/admin/units"
                variant="tonal"
              >
                Unidades de Medida
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
