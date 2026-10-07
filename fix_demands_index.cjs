const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/index.vue', 'utf8');

// 1. Add imports
code = code.replace(
  "import { getDemandStatusColor, formatDemandStatus, formatDemandType } from '~/utils/formatters'",
  "import { getDemandStatusColor, formatDemandStatus, formatDemandType } from '~/utils/formatters'\nimport { useZodForm } from '~/composables/useZodForm'\nimport { demandFormSchema } from '~/schemas/forms/demand'"
);

// 2. Replace useModal and add useZodForm
const useModalRegex = /const modal = useModal<Partial<DemandRow>>\(\{\s*id: '',\s*name: '',\s*type: 'consumption',\s*process_number: '',\s*id_pca: '',\s*contract_number: '',\s*\}\)/;
const useModalReplacement = `const { errors, defineField, resetForm, handleSubmit } = useZodForm(demandFormSchema, {
    name: '',
    type: 'consumption',
    process_number: '',
    id_pca: '',
    contract_number: '',
  })

  const [name, nameProps] = defineField('name')
  const [type, typeProps] = defineField('type')
  const [processNumber, processNumberProps] = defineField('process_number')
  const [idPca, idPcaProps] = defineField('id_pca')
  const [contractNumber, contractNumberProps] = defineField('contract_number')

  const modal = useModal<{ id?: string }>({})

  const originalOpen = modal.open.bind(modal)
  modal.open = (item?: any) => {
    if (item) {
      resetForm({
        values: {
          id: item.id,
          name: item.name || '',
          type: item.type || 'consumption',
          process_number: item.process_number || '',
          id_pca: item.id_pca || '',
          contract_number: item.contract_number ? String(item.contract_number) : '',
        }
      })
      originalOpen({ id: item.id })
    } else {
      resetForm()
      originalOpen({})
    }
  }`;
code = code.replace(useModalRegex, useModalReplacement);

// 3. Replace saveDemand function
const saveDemandStart = code.indexOf('const saveDemand = async () => {');
const saveDemandEnd = code.indexOf('modal.stopSaving()', saveDemandStart);
const endBrace1 = code.indexOf('}', saveDemandEnd);
const endBrace2 = code.indexOf('}', endBrace1 + 1);

const saveDemandReplacement = `const saveDemand = handleSubmit(async (values) => {
    modal.startSaving()
    modal.error.value = ''
    try {
      const payload = {
        name: values.name,
        type: values.type,
        process_number: values.process_number || null,
        id_pca: values.id_pca || null,
        contract_number: values.contract_number ? String(values.contract_number) : null,
      }

      if (values.id) {
        await updateDemand(values.id, payload)
      } else {
        await createDemand({ ...payload, user_id: profile.value!.id })
      }

      await refresh()
      modal.close()
    } catch (err: unknown) {
      if (err instanceof Error) {
        modal.error.value = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        modal.error.value = String((err as Record<string, unknown>).message)
      } else {
        modal.error.value = 'Ocorreu um erro desconhecido.'
      }
    } finally {
      modal.stopSaving()
    }
  })`;

code = code.slice(0, saveDemandStart) + saveDemandReplacement + code.slice(endBrace2 + 1);

// 4. Update the template
code = code.replace(/:title="modal\.payload\.value\.id \? 'Editar Demanda' : 'Nova Demanda'"/, `:title="modal.payload.value?.id ? 'Editar Demanda' : 'Nova Demanda'"`);

code = code.replace(
  /<UiInput v-model="modal\.payload\.value\.name" label="Nome da Demanda \*" required \/>/g,
  '<UiInput\n        v-model="name"\n        v-bind="nameProps"\n        :error-messages="errors.name"\n        label="Nome da Demanda *"\n        required\n      />'
);

code = code.replace(
  /v-model="modal\.payload\.value\.type"/g,
  'v-model="type"\n        v-bind="typeProps"\n        :error-messages="errors.type"'
);

code = code.replace(
  /v-model="modal\.payload\.value\.process_number"/g,
  'v-model="processNumber"\n        v-bind="processNumberProps"\n        :error-messages="errors.process_number"'
);

code = code.replace(
  /v-model="modal\.payload\.value\.id_pca"/g,
  'v-model="idPca"\n        v-bind="idPcaProps"\n        :error-messages="errors.id_pca"'
);

code = code.replace(
  /v-model="modal\.payload\.value\.contract_number"/g,
  'v-model="contractNumber"\n        v-bind="contractNumberProps"\n        :error-messages="errors.contract_number"'
);

fs.writeFileSync('app/pages/demands/index.vue', code, 'utf8');
console.log('Fixed demands index page');
