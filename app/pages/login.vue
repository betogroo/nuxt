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
  <UiCard class="w-100" rounded="xl">
    <template #header>
      <span class="text-subtitle-1 font-weight-bold">
        {{ tab === 'password' ? 'Acesse sua conta' : 'Acesso por código' }}
      </span>
    </template>

    <UiAlert v-if="inactiveError" class="mb-4" type="error" variant="tonal">
      Sua conta foi desativada por um administrador.
    </UiAlert>

    <!-- Seletor de método de login -->
    <v-btn-toggle
      v-model="tab"
      class="mb-5 w-100"
      density="compact"
      divided
      mandatory
      rounded="lg"
      variant="outlined"
    >
      <v-btn class="flex-1-1" size="small" value="password">
        <UiIcon class="mr-2" name="security" size="16" />
        Senha
      </v-btn>
      <v-btn class="flex-1-1" size="small" value="magic">
        <UiIcon class="mr-2" name="emailAlt" size="16" />
        Código por E-mail
      </v-btn>
    </v-btn-toggle>

    <!-- ABA: SENHA -->
    <template v-if="tab === 'password'">
      <UiAlert v-if="errorPassword" class="mb-4" type="error">
        {{ errorPassword }}
      </UiAlert>

      <UiInput
        v-model="emailPassword"
        label="E-mail"
        prepend-inner-icon="mdi-email-outline"
        type="email"
      />

      <UiInput
        v-model="password"
        label="Senha"
        prepend-inner-icon="mdi-lock-outline"
        type="password"
        @keyup.enter="signInWithPassword"
      />

      <UiButton
        block
        color="primary"
        :loading="loadingPassword"
        rounded="lg"
        size="large"
        variant="flat"
        @click="signInWithPassword"
      >
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
          prepend-inner-icon="mdi-email-outline"
          type="email"
          @keyup.enter="handleSendOtp"
        />

        <UiButton
          block
          color="primary"
          :loading="loadingOtp"
          rounded="lg"
          size="large"
          variant="flat"
          @click="handleSendOtp"
        >
          Enviar Código
        </UiButton>
      </template>

      <template v-else>
        <p class="text-body-2 text-medium-emphasis text-center mb-4">
          Digite o código de 6 dígitos enviado para <strong>{{ emailOtp }}</strong>
        </p>
        <UiOtpInput v-model="otpCode" @finish="handleVerifyOtp" />

        <UiButton
          block
          class="mt-4"
          color="primary"
          :loading="loadingOtp"
          rounded="lg"
          size="large"
          variant="flat"
          @click="handleVerifyOtp"
        >
          Verificar e Acessar
        </UiButton>

        <v-btn block class="mt-2" size="small" variant="text" @click="isOtpSent = false">
          Usar outro e-mail
        </v-btn>
      </template>
    </template>

    <p class="text-center text-body-2 text-medium-emphasis mt-5 mb-0">
      Não tem uma conta?
      <NuxtLink class="text-primary font-weight-medium text-decoration-none" to="/register">
        Registre-se
      </NuxtLink>
    </p>
  </UiCard>
</template>
