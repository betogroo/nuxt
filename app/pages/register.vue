<script setup lang="ts">
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const message = ref('')

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo('/')
    }
  })

  const signUp = async () => {
    loading.value = true
    message.value = ''

    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        // Endereço de callback após o usuário clicar no link de confirmação
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (error) {
      message.value = error.message
    } else if (data.session) {
      // Ambiente local: confirmação de e-mail desligada, session existe → login automático
      return navigateTo('/')
    } else {
      // Produção: confirmação de e-mail ligada, usuário precisa clicar no link
      message.value = 'Cadastro bem-sucedido! Verifique seu e-mail para confirmar.'
    }
    loading.value = false
  }
</script>

<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" md="5" sm="8">
        <v-card>
          <v-card-title>Registrar</v-card-title>
          <v-card-text>
            <v-alert v-if="message" class="mb-4" type="info">{{ message }}</v-alert>

            <v-text-field v-model="email" label="E-mail" type="email" variant="outlined" />
            <v-text-field v-model="password" label="Senha" type="password" variant="outlined" />

            <v-btn block color="primary" :loading="loading" @click="signUp"> Registrar </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
