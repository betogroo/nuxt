<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  // 1. Aplica a Regra (Middleware) criada
  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Gerenciar Usuários' })

  const supabase = useSupabaseClient<Database>()

  // 2. Busca todos os usuários no banco
  const {
    data: users,
    pending,
    refresh,
  } = useAsyncData('admin-users', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  })
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <!-- Cabeçalho da Tabela -->
          <v-card-title class="d-flex align-center">
            Usuários do Sistema
            <v-spacer />
            <v-btn icon="mdi-refresh" :loading="pending" variant="text" @click="refresh" />
          </v-card-title>

          <v-divider />

          <!-- Tabela de Listagem -->
          <v-table hover>
            <thead>
              <tr>
                <th class="text-left">ID</th>
                <th class="text-left">Usuário</th>
                <th class="text-left">Cargo</th>
                <th class="text-left">Membro desde</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="text-grey text-caption font-weight-mono">
                  {{ user.id.split('-')[0] }}
                </td>
                <td>
                  <div class="d-flex align-center py-2">
                    <v-avatar class="mr-3" color="surface-variant" size="32">
                      <v-img v-if="user.avatar_url" :src="user.avatar_url" />
                      <v-icon v-else>mdi-account</v-icon>
                    </v-avatar>
                    <span>{{ user.name || 'Sem nome' }}</span>
                  </div>
                </td>
                <td>
                  <v-chip
                    :color="user.role === 'admin' ? 'primary' : 'grey'"
                    size="small"
                    :variant="user.role === 'admin' ? 'flat' : 'outlined'"
                  >
                    {{ user.role.toUpperCase() }}
                  </v-chip>
                </td>
                <td>
                  {{ new Date(user.created_at).toLocaleDateString() }}
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Estado Vazio / Loading -->
          <v-card-text v-if="!users?.length && !pending" class="text-center text-grey">
            Nenhum usuário encontrado.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
