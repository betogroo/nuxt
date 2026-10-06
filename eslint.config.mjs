// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default withNuxt([
  { ignores: ['app/schemas/generated/**', 'node_modules_old'] },
  eslintPluginPrettierRecommended,
  {
    rules: {
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/define-macros-order': [
        'error',
        { order: ['defineOptions', 'defineProps', 'defineEmits'] },
      ],
      'vue/attributes-order': [
        'error',
        {
          order: [
            'DEFINITION',
            'LIST_RENDERING',
            'CONDITIONALS',
            'RENDER_MODIFIERS',
            'GLOBAL',
            ['UNIQUE', 'SLOT'],
            'TWO_WAY_BINDING',
            'OTHER_DIRECTIVES',
            'OTHER_ATTR',
            'EVENTS',
            'CONTENT',
          ],
          alphabetical: true,
        },
      ],
    },
  },

  {
    ignores: [
      'app/schemas/generated/**',
      'app/components/**/*.vue',
      'app/components/**/*.ts',
      'app/components/**/*.js',
      'eslint.config.mjs',
      'tests/**/*',
    ],
    rules: {
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'VElement[name=/^v-/]',
          message:
            'Uso de tags do Vuetify (<v-*>) é proibido fora da pasta components. Utilize os componentes da pasta ui/ correspondentes.',
        },
        {
          selector: 'VAttribute[value.value=/mdi-/]',
          message:
            'Uso de classes ou strings "mdi-*" é proibido. Utilize as propriedades nativas dos componentes Ui ou UiIcon.',
        },
        {
          selector: 'VLiteral[value=/mdi-/]',
          message:
            'Uso de strings "mdi-*" é proibido. Utilize as propriedades nativas dos componentes Ui ou UiIcon.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/mdi-/]',
          message:
            'Uso de strings "mdi-*" é proibido fora da pasta components. Mapeie ícones de forma agnóstica.',
        },
        {
          selector: 'TemplateElement[value.raw=/mdi-/]',
          message:
            'Uso de strings "mdi-*" é proibido fora da pasta components. Mapeie ícones de forma agnóstica.',
        },
      ],
    },
  },
])
