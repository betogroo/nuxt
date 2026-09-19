<script setup lang="ts">
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo('/')
    }
  })

  const tab = ref<'password' | 'magic'>('password')
  useHead({ title: 'Entrar' })

  // Login com senha
  const emailPassword = ref('')
  const password = ref('')
  const loadingPassword = ref(false)
  const errorPassword = ref('')

  const { logAction } = useLogger()

  const signInWithPassword = async () => {
    loadingPassword.value = true
    errorPassword.value = ''

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailPassword.value,
      password: password.value,
    })

    if (error) {
      errorPassword.value = error.message
    } else if (data.user) {
      await logAction('LOGIN', 'Acesso via senha', data.user.id)
    }
    loadingPassword.value = false
  }

  // Login com link mágico
  const emailMagic = ref('')
  const loadingMagic = ref(false)
  const messageMagic = ref('')
  const errorMagic = ref('')

  const signInWithMagicLink = async () => {
    loadingMagic.value = true
    errorMagic.value = ''
    messageMagic.value = ''

    const { error } = await supabase.auth.signInWithOtp({
      email: emailMagic.value,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (error) {
      errorMagic.value = error.message
    } else {
      messageMagic.value = 'Verifique seu e-mail para o link de acesso.'
    }
    loadingMagic.value = false
  }
</script>

<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" md="5" sm="8">
        <v-card>
          <v-card-title class="text-center py-4"> Entrar </v-card-title>

          <v-tabs v-model="tab" align-tabs="center">
            <v-tab value="password">Email e Senha</v-tab>
            <v-tab value="magic">Link Mágico</v-tab>
          </v-tabs>

          <v-card-text class="pt-4">
            <!-- ABA: SENHA -->
            <template v-if="tab === 'password'">
              <v-alert v-if="errorPassword" class="mb-4" type="error">
                {{ errorPassword }}
              </v-alert>

              <v-text-field
                v-model="emailPassword"
                class="mb-2"
                label="E-mail"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="password"
                class="mb-4"
                label="Senha"
                type="password"
                variant="outlined"
                @keyup.enter="signInWithPassword"
              />

              <v-btn block color="primary" :loading="loadingPassword" @click="signInWithPassword">
                Entrar
              </v-btn>
            </template>

            <!-- ABA: LINK MÁGICO -->
            <template v-else>
              <v-alert v-if="errorMagic" class="mb-4" type="error">
                {{ errorMagic }}
              </v-alert>

              <v-alert v-if="messageMagic" class="mb-4" type="success">
                {{ messageMagic }}
              </v-alert>

              <v-text-field
                v-model="emailMagic"
                class="mb-4"
                label="E-mail"
                type="email"
                variant="outlined"
                @keyup.enter="signInWithMagicLink"
              />

              <v-btn block color="primary" :loading="loadingMagic" @click="signInWithMagicLink">
                Enviar Link de Acesso
              </v-btn>
            </template>
          </v-card-text>
        </v-card>

        <p class="text-center mt-4">
          Não tem uma conta?
          <NuxtLink to="/register">Registre-se</NuxtLink>
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
