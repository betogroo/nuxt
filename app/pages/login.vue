<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const { user, signInWithPassword: loginWithPassword, signInWithMagicLink: loginWithMagicLink } =
    useAuth()

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo('/')
    }
  })

  const tab = ref<'password' | 'magic'>('password')
  useHead({ title: 'Entrar' })

  const route = useRoute()
  const inactiveError = computed(() => route.query.error === 'inactive')

  // Login com senha
  const emailPassword = ref('')
  const password = ref('')
  const loadingPassword = ref(false)
  const errorPassword = ref('')

  const signInWithPassword = async () => {
    loadingPassword.value = true
    errorPassword.value = ''

    const { error } = await loginWithPassword(emailPassword.value, password.value)

    if (error) {
      errorPassword.value = error.message
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

    const { error } = await loginWithMagicLink(
      emailMagic.value,
      `${window.location.origin}/confirm`,
    )

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
        <UiCard>
          <template #header>
            <div class="text-center w-100">Entrar</div>
          </template>

          <v-tabs v-model="tab" align-tabs="center">
            <v-tab value="password">Email e Senha</v-tab>
            <v-tab value="magic">Link Mágico</v-tab>
          </v-tabs>

          <v-alert v-if="inactiveError" class="mx-4 mt-4" type="error" variant="tonal">
            Sua conta foi desativada por um administrador.
          </v-alert>

          <!-- ABA: SENHA -->
          <template v-if="tab === 'password'">
            <v-alert v-if="errorPassword" class="mb-4" type="error">
              {{ errorPassword }}
            </v-alert>

            <UiInput v-model="emailPassword" label="E-mail" type="email" />

            <UiInput
              v-model="password"
              label="Senha"
              type="password"
              @keyup.enter="signInWithPassword"
            />

            <UiButton block color="primary" :loading="loadingPassword" @click="signInWithPassword">
              Entrar
            </UiButton>
          </template>

          <!-- ABA: LINK MÁGICO -->
          <template v-else>
            <v-alert v-if="errorMagic" class="mb-4" type="error">
              {{ errorMagic }}
            </v-alert>

            <v-alert v-if="messageMagic" class="mb-4" type="success">
              {{ messageMagic }}
            </v-alert>

            <UiInput
              v-model="emailMagic"
              label="E-mail"
              type="email"
              @keyup.enter="signInWithMagicLink"
            />

            <UiButton block color="primary" :loading="loadingMagic" @click="signInWithMagicLink">
              Enviar Link de Acesso
            </UiButton>
          </template>
        </UiCard>

        <p class="text-center mt-4">
          Não tem uma conta?
          <NuxtLink to="/register">Registre-se</NuxtLink>
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
