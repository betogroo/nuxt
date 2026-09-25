<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const {
    user,
    signInWithPassword: loginWithPassword,
    sendOtp,
    verifyOtpCode,
    getRedirectUrl,
  } = useAuth()

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo(getRedirectUrl(), { replace: true })
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
  const emailOtp = ref('')
  const loadingOtp = ref(false)
  const messageOtp = ref('')
  const errorOtp = ref('')
  const otpCode = ref('')
  const isOtpSent = ref(false)

  const handleSendOtp = async () => {
    loadingOtp.value = true
    errorOtp.value = ''
    messageOtp.value = ''

    const { error } = await sendOtp(emailOtp.value, `${window.location.origin}/confirm`)

    if (error) {
      errorOtp.value = error.message
    } else {
      messageOtp.value =
        'Código enviado para o e-mail (você também pode clicar no link que enviamos).'
      isOtpSent.value = true
    }
    loadingOtp.value = false
  }

  const handleVerifyOtp = async () => {
    loadingOtp.value = true
    errorOtp.value = ''

    const { error } = await verifyOtpCode(emailOtp.value, otpCode.value)

    if (error) {
      errorOtp.value = error.message
    }
    loadingOtp.value = false
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
            <v-tab value="magic">Código (E-mail)</v-tab>
          </v-tabs>

          <UiAlert v-if="inactiveError" class="mx-4 mt-4" type="error" variant="tonal">
            Sua conta foi desativada por um administrador.
          </UiAlert>

          <!-- ABA: SENHA -->
          <template v-if="tab === 'password'">
            <UiAlert v-if="errorPassword" class="mb-4" type="error">
              {{ errorPassword }}
            </UiAlert>

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

          <!-- ABA: CÓDIGO OTP -->
          <template v-else>
            <UiAlert v-if="errorOtp" class="mb-4" type="error">
              {{ errorOtp }}
            </UiAlert>

            <UiAlert v-if="messageOtp" class="mb-4" type="success">
              {{ messageOtp }}
            </UiAlert>

            <template v-if="!isOtpSent">
              <UiInput
                v-model="emailOtp"
                label="E-mail"
                type="email"
                @keyup.enter="handleSendOtp"
              />

              <UiButton block color="primary" :loading="loadingOtp" @click="handleSendOtp">
                Enviar Código
              </UiButton>
            </template>
            <template v-else>
              <UiInput
                v-model="otpCode"
                label="Código de 6 dígitos"
                type="text"
                @keyup.enter="handleVerifyOtp"
              />

              <UiButton block color="primary" :loading="loadingOtp" @click="handleVerifyOtp">
                Acessar
              </UiButton>
            </template>
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
