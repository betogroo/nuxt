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
  <v-container>
    <v-row align="center" class="mb-4">
      <v-col>
        <h1 class="text-h4 font-weight-bold text-primary">Painel de Controle</h1>
        <p class="text-subtitle-1 text-grey">Resumo e estatísticas do sistema</p>
      </v-col>
    </v-row>

    <v-row v-if="pending">
      <v-col class="text-center" cols="12">
        <v-progress-circular color="primary" indeterminate size="64" />
      </v-col>
    </v-row>

    <template v-else-if="metrics">
      <!-- Top Metrics Cards -->
      <v-row>
        <v-col cols="12" md="3" sm="6">
          <v-card class="bg-primary text-white" elevation="3">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-uppercase font-weight-bold opacity-80">Usuários</div>
                <div class="text-h4 font-weight-black mt-1">{{ metrics.usersCount }}</div>
              </div>
              <v-icon class="opacity-50" size="48">mdi-account-group</v-icon>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="bg-success text-white" elevation="3">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-uppercase font-weight-bold opacity-80">Demandas</div>
                <div class="text-h4 font-weight-black mt-1">{{ metrics.demandsCount }}</div>
              </div>
              <v-icon class="opacity-50" size="48">mdi-clipboard-list</v-icon>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="bg-info text-white" elevation="3">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-uppercase font-weight-bold opacity-80">
                  Produtos Ativos
                </div>
                <div class="text-h4 font-weight-black mt-1">{{ metrics.productsCount }}</div>
              </div>
              <v-icon class="opacity-50" size="48">mdi-package-variant</v-icon>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3" sm="6">
          <v-card class="bg-deep-purple text-white" elevation="3">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-uppercase font-weight-bold opacity-80">
                  Categorias
                </div>
                <div class="text-h4 font-weight-black mt-1">{{ metrics.categoriesCount }}</div>
              </div>
              <v-icon class="opacity-50" size="48">mdi-shape</v-icon>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-6">
        <!-- Recent Activity Feed -->
        <v-col cols="12" md="8">
          <v-card elevation="2" height="100%">
            <v-card-title class="d-flex align-center bg-grey-lighten-4 pa-4">
              <v-icon class="mr-2" color="primary">mdi-history</v-icon>
              Atividade Recente
            </v-card-title>
            <v-divider />

            <v-list lines="two">
              <template v-for="(log, index) in metrics.recentLogs" :key="log.id">
                <v-list-item>
                  <template #prepend>
                    <v-avatar class="text-white" :color="getLogColor(log.action)" size="40">
                      <v-icon size="20">mdi-flash</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ log.action.replace(/_/g, ' ') }}
                  </v-list-item-title>

                  <v-list-item-subtitle class="mt-1">
                    {{ log.description }}
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex flex-column align-end">
                      <div class="text-caption text-grey">
                        {{ formatDate(log.created_at) }}
                      </div>
                      <v-chip class="mt-1" size="x-small" variant="tonal">
                        {{ log.profiles?.name || 'Sistema' }}
                      </v-chip>
                    </div>
                  </template>
                </v-list-item>

                <v-divider v-if="index < metrics.recentLogs.length - 1" inset />
              </template>

              <v-list-item v-if="!metrics.recentLogs.length">
                <v-list-item-title class="text-grey text-center py-4"
                  >Nenhuma atividade registrada ainda.</v-list-item-title
                >
              </v-list-item>
            </v-list>

            <v-card-actions class="justify-center bg-grey-lighten-4">
              <v-btn color="primary" to="/logs" variant="text">Ver Todos os Registros</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Quick Access / Actions -->
        <v-col cols="12" md="4">
          <v-card elevation="2" height="100%">
            <v-card-title class="d-flex align-center bg-grey-lighten-4 pa-4">
              <v-icon class="mr-2" color="primary">mdi-lightning-bolt</v-icon>
              Acesso Rápido
            </v-card-title>
            <v-divider />

            <v-card-text class="pa-4">
              <v-btn
                block
                class="mb-3 justify-start"
                color="primary"
                prepend-icon="mdi-account-group"
                size="large"
                to="/users"
              >
                Gerenciar Usuários
              </v-btn>

              <v-btn
                block
                class="mb-3 justify-start"
                color="deep-purple"
                prepend-icon="mdi-shape"
                size="large"
                to="/admin/categories"
              >
                Categorias de Produtos
              </v-btn>

              <v-btn
                block
                class="mb-3 justify-start"
                color="info"
                prepend-icon="mdi-package-variant"
                size="large"
                to="/products"
              >
                Ver Produtos
              </v-btn>

              <v-btn
                block
                class="justify-start text-white"
                color="blue-grey"
                prepend-icon="mdi-format-list-bulleted-type"
                size="large"
                to="/logs"
              >
                Auditoria de Logs
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
