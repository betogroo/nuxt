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
  const loadingPassword = ref(false)
  const errorPassword = ref('')

  const {
    errors: passErrors,
    defineField: passDefine,
    handleSubmit: passSubmit,
  } = useZodForm(loginPasswordSchema, {
    email: '',
    password: '',
  })
  const [emailPassword, emailPasswordProps] = passDefine('email')
  const [password, passwordProps] = passDefine('password')

  const signInWithPassword = passSubmit(async (values) => {
    loadingPassword.value = true
    errorPassword.value = ''
    const { error } = await loginWithPassword(values.email, values.password)
    if (error) {
      errorPassword.value = error.message
    }
    loadingPassword.value = false
  })

  // Login com link mágico
  const loadingOtp = ref(false)
  const messageOtp = ref('')
  const errorOtp = ref('')
  const isOtpSent = ref(false)

  const {
    errors: magicErrors,
    defineField: magicDefine,
    handleSubmit: magicSubmit,
  } = useZodForm(loginMagicLinkSchema, { email: '' })
  const [emailMagic, emailMagicProps] = magicDefine('email')

  const {
    errors: otpErrors,
    defineField: otpDefine,
    handleSubmit: otpSubmit,
  } = useZodForm(loginOtpSchema, { email: '', otpCode: '' })
  const [emailOtp] = otpDefine('email')
  const [otpCode, otpCodeProps] = otpDefine('otpCode')

  watchEffect(() => {
    // Keep emails in sync for UX
    if (!isOtpSent.value) {
      emailOtp.value = emailMagic.value
    }
  })

  const handleSendOtp = magicSubmit(async (values) => {
    loadingOtp.value = true
    errorOtp.value = ''
    messageOtp.value = ''
    const { error } = await sendOtp(values.email, `${window.location.origin}/confirm`)
    if (error) {
      errorOtp.value = error.message
    } else {
      messageOtp.value =
        'Código enviado para o e-mail (você também pode clicar no link que enviamos).'
      isOtpSent.value = true
      emailOtp.value = values.email
    }
    loadingOtp.value = false
  })

  const handleVerifyOtp = otpSubmit(async (values) => {
    loadingOtp.value = true
    errorOtp.value = ''
    const { error } = await verifyOtpCode(values.email, values.otpCode)
    if (error) {
      errorOtp.value = error.message
    }
    loadingOtp.value = false
  })
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
    <UiBtnToggle
      v-model="tab"
      class="mb-5 w-100"
      density="compact"
      divided
      mandatory
      rounded="lg"
      variant="outlined"
    >
      <UiButton class="flex-1-1" size="small" value="password">
        <UiIcon class="mr-2" name="security" size="16" />
        Senha
      </UiButton>
      <UiButton class="flex-1-1" size="small" value="magic">
        <UiIcon class="mr-2" name="emailAlt" size="16" />
        Código por E-mail
      </UiButton>
    </UiBtnToggle>

    <!-- ABA: SENHA -->
    <template v-if="tab === 'password'">
      <UiAlert v-if="errorPassword" class="mb-4" type="error">
        {{ errorPassword }}
      </UiAlert>

      <UiInput
        v-model="emailPassword"
        v-bind="emailPasswordProps"
        :error-messages="passErrors.email"
        label="E-mail"
        prepend-inner-icon="emailAlt"
        type="email"
      />

      <UiInput
        v-model="password"
        v-bind="passwordProps"
        :error-messages="passErrors.password"
        label="Senha"
        prepend-inner-icon="lock"
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
          v-model="emailMagic"
          v-bind="emailMagicProps"
          :error-messages="magicErrors.email"
          label="E-mail"
          prepend-inner-icon="emailAlt"
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
        <UiOtpInput v-model="otpCode" v-bind="otpCodeProps" @finish="handleVerifyOtp" />
        <div v-if="otpErrors.otpCode" class="text-error text-caption text-center mt-2">
          {{ otpErrors.otpCode }}
        </div>

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

        <UiButton block class="mt-2" size="small" variant="text" @click="isOtpSent = false">
          Usar outro e-mail
        </UiButton>
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
