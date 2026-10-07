const fs = require('fs');
let code = fs.readFileSync('app/pages/login.vue', 'utf8');

code = code.replace(
  "import { useAuth } from '~/composables/useAuth'",
  "import { useAuth } from '~/composables/useAuth'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { loginPasswordSchema, loginMagicLinkSchema, loginOtpSchema } from '~/schemas/forms/auth'"
);

// Password Form
const passStateRegex = /const emailPassword = ref\(''\)\s*const password = ref\(''\)\s*const loadingPassword = ref\(false\)\s*const errorPassword = ref\(''\)/;
const passStateReplacement = `const loadingPassword = ref(false)
  const errorPassword = ref('')

  const { errors: passErrors, defineField: passDefine, handleSubmit: passSubmit } = useZodForm(loginPasswordSchema, {
    email: '',
    password: '',
  })
  const [emailPassword, emailPasswordProps] = passDefine('email')
  const [password, passwordProps] = passDefine('password')`;
code = code.replace(passStateRegex, passStateReplacement);

const signInRegex = /const signInWithPassword = async \(\) => \{[\s\S]*?loadingPassword\.value = false\s*\}/;
const signInReplacement = `const signInWithPassword = passSubmit(async (values) => {
    loadingPassword.value = true
    errorPassword.value = ''
    const { error } = await loginWithPassword(values.email, values.password)
    if (error) {
      errorPassword.value = error.message
    }
    loadingPassword.value = false
  })`;
code = code.replace(signInRegex, signInReplacement);

// OTP Form
const otpStateRegex = /const emailOtp = ref\(''\)\s*const loadingOtp = ref\(false\)\s*const messageOtp = ref\(''\)\s*const errorOtp = ref\(''\)\s*const otpCode = ref\(''\)\s*const isOtpSent = ref\(false\)/;
const otpStateReplacement = `const loadingOtp = ref(false)
  const messageOtp = ref('')
  const errorOtp = ref('')
  const isOtpSent = ref(false)

  const { errors: magicErrors, defineField: magicDefine, handleSubmit: magicSubmit } = useZodForm(loginMagicLinkSchema, { email: '' })
  const [emailMagic, emailMagicProps] = magicDefine('email')

  const { errors: otpErrors, defineField: otpDefine, handleSubmit: otpSubmit } = useZodForm(loginOtpSchema, { email: '', otpCode: '' })
  const [emailOtp, emailOtpProps] = otpDefine('email')
  const [otpCode, otpCodeProps] = otpDefine('otpCode')

  watchEffect(() => {
    // Keep emails in sync for UX
    if (!isOtpSent.value) {
      emailOtp.value = emailMagic.value
    }
  })`;
code = code.replace(otpStateRegex, otpStateReplacement);

const sendOtpRegex = /const handleSendOtp = async \(\) => \{[\s\S]*?loadingOtp\.value = false\s*\}/;
const sendOtpReplacement = `const handleSendOtp = magicSubmit(async (values) => {
    loadingOtp.value = true
    errorOtp.value = ''
    messageOtp.value = ''
    const { error } = await sendOtp(values.email, \`\${window.location.origin}/confirm\`)
    if (error) {
      errorOtp.value = error.message
    } else {
      messageOtp.value = 'Código enviado para o e-mail (você também pode clicar no link que enviamos).'
      isOtpSent.value = true
      emailOtp.value = values.email
    }
    loadingOtp.value = false
  })`;
code = code.replace(sendOtpRegex, sendOtpReplacement);

const verifyOtpRegex = /const handleVerifyOtp = async \(\) => \{[\s\S]*?loadingOtp\.value = false\s*\}/;
const verifyOtpReplacement = `const handleVerifyOtp = otpSubmit(async (values) => {
    loadingOtp.value = true
    errorOtp.value = ''
    const { error } = await verifyOtpCode(values.email, values.otpCode)
    if (error) {
      errorOtp.value = error.message
    }
    loadingOtp.value = false
  })`;
code = code.replace(verifyOtpRegex, verifyOtpReplacement);

// Template - Password
code = code.replace(
  /<UiInput v-model="emailPassword" label="E-mail" required \/>/,
  `<UiInput
            v-model="emailPassword"
            v-bind="emailPasswordProps"
            :error-messages="passErrors.email"
            label="E-mail"
            required
          />`
);

code = code.replace(
  /<UiInput\s*v-model="password"\s*label="Senha"\s*required\s*type="password"\s*@keyup\.enter="signInWithPassword"\s*\/>/,
  `<UiInput
            v-model="password"
            v-bind="passwordProps"
            :error-messages="passErrors.password"
            label="Senha"
            required
            type="password"
            @keyup.enter="signInWithPassword"
          />`
);

// Template - Magic Link
code = code.replace(
  /<UiInput\s*v-model="emailOtp"\s*label="E-mail"\s*required\s*@keyup\.enter="handleSendOtp"\s*\/>/,
  `<UiInput
            v-model="emailMagic"
            v-bind="emailMagicProps"
            :error-messages="magicErrors.email"
            label="E-mail"
            required
            @keyup.enter="handleSendOtp"
          />`
);

// Template - OTP Verify
code = code.replace(
  /<UiOtpInput v-model="otpCode" class="mb-4" \/>/,
  `<UiOtpInput
            v-model="otpCode"
            v-bind="otpCodeProps"
            class="mb-4"
          />
          <div v-if="otpErrors.otpCode" class="text-error text-caption text-center mb-4">{{ otpErrors.otpCode }}</div>`
);

fs.writeFileSync('app/pages/login.vue', code, 'utf8');
console.log('Fixed login');
