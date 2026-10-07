const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

// Responsible Modal setup
const responsibleStateRegex = /\/\/ Add Responsible Modal State\s*const isResponsibleModalOpen = ref\(false\)\s*const responsibleUserId = ref<string \| null>\(null\)\s*const responsibleError = ref\(''\)/;
const responsibleReplacement = `// Add Responsible Modal State
  const isResponsibleModalOpen = ref(false)
  const responsibleError = ref('')

  const { errors: respErrors, defineField: respDefine, resetForm: respReset, handleSubmit: respSubmit } = useZodForm(demandResponsibleSchema, {
    user_id: '',
  })
  const [responsibleUserId, respUserIdProps] = respDefine('user_id')

  const openResponsibleModal = () => {
    respReset()
    responsibleError.value = ''
    isResponsibleModalOpen.value = true
  }`;
code = code.replace(responsibleStateRegex, responsibleReplacement);

// Responsible save logic
const handleAddResponsibleRegex = /const handleAddResponsible = async \(\) => \{\s*const success = await addResponsible\(responsibleUserId\.value \|\| ''\)\s*if \(success\) \{\s*isResponsibleModalOpen\.value = false\s*responsibleUserId\.value = null\s*\}\s*\}/;
const handleAddReplacement = `const handleAddResponsible = respSubmit(async (values) => {
    responsibleError.value = ''
    const success = await addResponsible(values.user_id)
    if (success) {
      isResponsibleModalOpen.value = false
    } else {
      responsibleError.value = 'Falha ao adicionar responsável.'
    }
  })`;
code = code.replace(handleAddResponsibleRegex, handleAddReplacement);

// Button opening modal
code = code.replace(/@click="isResponsibleModalOpen = true"/, `@click="openResponsibleModal"`);

// Modal template
code = code.replace(
  /<UiSelect\s*v-model="responsibleUserId"\s*item-title="name"\s*item-value="id"\s*:items="availableProfiles"\s*label="Selecione o Usuǭrio"\s*\/>/,
  `<UiSelect
        v-model="responsibleUserId"
        v-bind="respUserIdProps"
        :error-messages="respErrors.user_id"
        item-title="name"
        item-value="id"
        :items="availableProfiles"
        label="Selecione o Usuário"
      />`
);

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed responsible modal');
