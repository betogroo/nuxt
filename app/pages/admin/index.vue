<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Painel de Controle - Admin' })

  const supabase = useSupabaseClient<Database>()

  // Interface for nested join
  type RecentLog = Database['public']['Tables']['logs']['Row'] & {
    profiles?: { name: string } | null
  }

  const { data: metrics, pending } = useAsyncData('admin-dashboard-metrics', async () => {
    // Run all count queries concurrently for maximum performance
    const [usersRes, productsRes, demandsRes, categoriesRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('demands').select('*', { count: 'exact', head: true }),
      supabase.from('product_categories').select('*', { count: 'exact', head: true }),
      supabase
        .from('logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    return {
      usersCount: usersRes.count || 0,
      productsCount: productsRes.count || 0,
      demandsCount: demandsRes.count || 0,
      categoriesCount: categoriesRes.count || 0,
      recentLogs: (logsRes.data as RecentLog[]) || [],
    }
  })

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

  const getLogColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'success'
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'error'
    if (action.includes('UPDATE')) return 'warning'
    return 'primary'
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Resumo e estatísticas do sistema" title="Painel de Controle" />

    <div v-if="pending" class="d-flex justify-center my-12">
      <v-progress-circular color="primary" indeterminate size="64" />
    </div>

    <template v-else-if="metrics">
      <!-- Top Metrics Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3" sm="6">
          <v-card border elevation="0" rounded="lg">
            <v-card-text class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-grey">Usuários</div>
                <div class="text-h4 font-weight-black mt-1 text-primary">
                  {{ metrics.usersCount }}
                </div>
              </div>
              <v-avatar color="primary" rounded="lg" size="56" variant="tonal">
                <v-icon size="32">mdi-account-group</v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card border elevation="0" rounded="lg">
            <v-card-text class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-grey">Demandas</div>
                <div class="text-h4 font-weight-black mt-1 text-success">
                  {{ metrics.demandsCount }}
                </div>
              </div>
              <v-avatar color="success" rounded="lg" size="56" variant="tonal">
                <v-icon size="32">mdi-clipboard-list</v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card border elevation="0" rounded="lg">
            <v-card-text class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-grey">
                  Produtos Ativos
                </div>
                <div class="text-h4 font-weight-black mt-1 text-info">
                  {{ metrics.productsCount }}
                </div>
              </div>
              <v-avatar color="info" rounded="lg" size="56" variant="tonal">
                <v-icon size="32">mdi-package-variant</v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card border elevation="0" rounded="lg">
            <v-card-text class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-grey">Categorias</div>
                <div class="text-h4 font-weight-black mt-1 text-deep-purple">
                  {{ metrics.categoriesCount }}
                </div>
              </div>
              <v-avatar color="deep-purple" rounded="lg" size="56" variant="tonal">
                <v-icon size="32">mdi-shape</v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Bloco de Tarefas a Revisar -->
      <v-row v-if="totalPending > 0" class="mb-6">
        <v-col cols="12">
          <v-alert
            border="start"
            border-color="warning"
            color="warning"
            elevation="1"
            icon="mdi-clipboard-text-clock"
            title="Tarefas Pendentes de Revisão"
            variant="tonal"
          >
            <div class="d-flex flex-column gap-2 mt-3">
              <div
                v-if="pendingCategoriesCount > 0"
                class="d-flex align-center justify-space-between"
              >
                <span class="d-flex align-center">
                  <v-icon class="mr-2" size="small">mdi-shape</v-icon>
                  Revisão de Categorias Sugeridas ({{ pendingCategoriesCount }})
                </span>
                <UiButton color="warning" size="small" to="/admin/categories" variant="outlined"
                  >Revisar</UiButton
                >
              </div>
              <v-divider v-if="pendingCategoriesCount > 0 && pendingUnitsCount > 0" class="my-1" />
              <div v-if="pendingUnitsCount > 0" class="d-flex align-center justify-space-between">
                <span class="d-flex align-center">
                  <v-icon class="mr-2" size="small">mdi-scale-balance</v-icon>
                  Aprovação de Unidades de Medida Pendentes ({{ pendingUnitsCount }})
                </span>
                <UiButton color="warning" size="small" to="/admin/units" variant="outlined"
                  >Revisar</UiButton
                >
              </div>
            </div>
          </v-alert>
        </v-col>
      </v-row>

      <v-row>
        <!-- Recent Activity Feed -->
        <v-col cols="12" md="8">
          <UiCard class="h-100" title="Atividade Recente">
            <template #header>
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-history</v-icon>
                Atividade Recente
              </div>
            </template>

            <div class="px-4 py-2">
              <v-timeline
                v-if="metrics.recentLogs.length"
                align="start"
                density="compact"
                truncate-line="both"
              >
                <v-timeline-item
                  v-for="log in metrics.recentLogs"
                  :key="log.id"
                  :dot-color="getLogColor(log.action)"
                  size="small"
                >
                  <div class="mb-1">
                    <strong>{{ log.action.replace(/_/g, ' ') }}</strong>
                    <div class="text-caption text-grey mt-1">
                      {{ formatDate(log.created_at) }} &bull; {{ log.profiles?.name || 'Sistema' }}
                    </div>
                  </div>
                  <div class="text-body-2">{{ log.description }}</div>
                </v-timeline-item>
              </v-timeline>
              <div v-else class="text-center text-grey py-8">
                Nenhuma atividade registrada ainda.
              </div>
            </div>

            <template #actions>
              <UiButton color="primary" to="/logs" variant="text">Ver Todos os Registros</UiButton>
            </template>
          </UiCard>
        </v-col>

        <!-- Quick Access / Actions -->
        <v-col cols="12" md="4">
          <UiCard class="h-100" title="Acesso Rápido">
            <template #header>
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-lightning-bolt</v-icon>
                Acesso Rápido
              </div>
            </template>

            <div class="d-flex flex-column gap-3 mt-2">
              <UiButton
                block
                class="justify-start"
                color="primary"
                prepend-icon="mdi-account-group"
                size="large"
                to="/users"
                variant="tonal"
              >
                Gerenciar Usuários
              </UiButton>

              <UiButton
                block
                class="justify-start"
                color="deep-purple"
                prepend-icon="mdi-shape"
                size="large"
                to="/admin/categories"
                variant="tonal"
              >
                Categorias de Produtos
              </UiButton>

              <UiButton
                block
                class="justify-start"
                color="info"
                prepend-icon="mdi-package-variant"
                size="large"
                to="/products"
                variant="tonal"
              >
                Ver Produtos
              </UiButton>

              <UiButton
                block
                class="justify-start"
                color="blue-grey"
                prepend-icon="mdi-format-list-bulleted-type"
                size="large"
                to="/logs"
                variant="tonal"
              >
                Auditoria de Logs
              </UiButton>
            </div>
          </UiCard>
        </v-col>
      </v-row>
    </template>
  </div>
</template>
