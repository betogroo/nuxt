const fs = require('fs');
let code = fs.readFileSync('app/pages/register.vue', 'utf8');

code = code.replace(
  "import { useAuth } from '~/composables/useAuth'",
  "import { useAuth } from '~/composables/useAuth'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { registerSchema } from '~/schemas/forms/auth'"
);

const stateRegex = /const email = ref\(''\)\s*const password = ref\(''\)\s*const loading = ref\(false\)\s*const message = ref\(''\)/;
const stateReplacement = `const loading = ref(false)
  const message = ref('')

  const { errors, defineField, handleSubmit } = useZodForm(registerSchema, {
    email: '',
    password: '',
  })
  const [email, emailProps] = defineField('email')
  const [password, passwordProps] = defineField('password')`;
code = code.replace(stateRegex, stateReplacement);

const signUpRegex = /const signUp = async \(\) => \{[\s\S]*?loading\.value = false\s*\}/;
const signUpReplacement = `const signUp = handleSubmit(async (values) => {
    loading.value = true
    message.value = ''

    const { data, error } = await register(
      values.email,
      values.password,
      \`\${window.location.origin}/confirm\`,
    )

    if (error) {
      message.value = error.message
    } else if (data.session) {
      return navigateTo(getRedirectUrl(), { replace: true })
    } else {
      message.value = 'Cadastro bem-sucedido! Verifique seu e-mail para confirmar.'
    }
    loading.value = false
  })`;
code = code.replace(signUpRegex, signUpReplacement);

code = code.replace(
  /<UiInput v-model="email"[^>]+>/,
  `<UiInput
            v-model="email"
            v-bind="emailProps"
            :error-messages="errors.email"
            label="E-mail"
            prepend-inner-icon="emailAlt"
            required
            type="email"
          />`
);

code = code.replace(
  /<UiInput\s*v-model="password"[^>]+>/,
  `<UiInput
            v-model="password"
            v-bind="passwordProps"
            :error-messages="errors.password"
            label="Senha"
            prepend-inner-icon="lock"
            required
            type="password"
            @keyup.enter="signUp"
          />`
);

fs.writeFileSync('app/pages/register.vue', code, 'utf8');
console.log('Fixed register');
