const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

// 1. Add Zod imports
if (!code.includes('useZodForm')) {
  code = code.replace(
    "import { formatDemandStatus, getDemandStatusColor, formatDemandType } from '~/utils/formatters'",
    "import { formatDemandStatus, getDemandStatusColor, formatDemandType } from '~/utils/formatters'\nimport { useZodForm } from '~/composables/useZodForm'\nimport { demandFormSchema, demandResponsibleSchema } from '~/schemas/forms/demand'\nimport { demandItemFormSchema } from '~/schemas/forms/demand-item'"
  );
}

// 2. Edit Planning Form
const editPlanningModalRegex = /const editPlanningModal = useModal<Partial<DemandRow>>\(\{[\s\S]*?contract_number: '',\s*\}\)/;
const editPlanningReplacement = `const { errors: epErrors, defineField: epDefine, resetForm: epReset, handleSubmit: epSubmit } = useZodForm(demandFormSchema, {
    name: '',
    type: 'consumption',
    process_number: '',
    id_pca: '',
    contract_number: '',
  })

  const [epName, epNameProps] = epDefine('name')
  const [epType, epTypeProps] = epDefine('type')
  const [epProcess, epProcessProps] = epDefine('process_number')
  const [epIdPca, epIdPcaProps] = epDefine('id_pca')
  const [epContract, epContractProps] = epDefine('contract_number')

  const editPlanningModal = useModal({})`;
code = code.replace(editPlanningModalRegex, editPlanningReplacement);

// Fix openEditPlanning
code = code.replace(
  /editPlanningModal\.open\(\{[\s\S]*?contract_number: demand\.value\.contract_number \|\| '',\s*\}\)/,
  `epReset({
        values: {
          id: demand.value.id,
          name: demand.value.name,
          type: demand.value.type as "consumption" | "permanent",
          process_number: demand.value.process_number || '',
          id_pca: demand.value.id_pca || '',
          contract_number: demand.value.contract_number ? String(demand.value.contract_number) : '',
        }
      })
      editPlanningModal.open()`
);

// Fix savePlanning
const savePlanningStart = code.indexOf('const savePlanning = async () => {');
const savePlanningEnd = code.indexOf('editPlanningModal.stopSaving()', savePlanningStart);
const epBrace1 = code.indexOf('}', savePlanningEnd);
const epBrace2 = code.indexOf('}', epBrace1 + 1);

const savePlanningReplacement = `const savePlanning = epSubmit(async (values) => {
    editPlanningModal.startSaving()
    try {
      const payload = {
        name: values.name,
        type: values.type,
        process_number: values.process_number || null,
        id_pca: values.id_pca || null,
        contract_number: values.contract_number || null,
      }
      await updateDemand(demandId, payload)
      await refreshDemand()
      editPlanningModal.close()
    } catch (err: unknown) {
      editPlanningModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      editPlanningModal.stopSaving()
    }
  })`;

code = code.slice(0, savePlanningStart) + savePlanningReplacement + code.slice(epBrace2 + 1);

// Template: Edit Planning Modal
code = code.replace(
  /<UiInput v-model="editPlanningModal\.payload\.value\.name" label="Nome da Demanda\*" required \/>/,
  `<UiInput
        v-model="epName"
        v-bind="epNameProps"
        :error-messages="epErrors.name"
        label="Nome da Demanda*"
        required
      />`
);

code = code.replace(
  /v-model="editPlanningModal\.payload\.value\.type"/,
  `v-model="epType"\n        v-bind="epTypeProps"\n        :error-messages="epErrors.type"`
);

code = code.replace(
  /v-model="editPlanningModal\.payload\.value\.process_number"/,
  `v-model="epProcess"\n        v-bind="epProcessProps"\n        :error-messages="epErrors.process_number"`
);

code = code.replace(
  /v-model="editPlanningModal\.payload\.value\.id_pca"/,
  `v-model="epIdPca"\n        v-bind="epIdPcaProps"\n        :error-messages="epErrors.id_pca"`
);

code = code.replace(
  /v-model="editPlanningModal\.payload\.value\.contract_number"/,
  `v-model="epContract"\n        v-bind="epContractProps"\n        :error-messages="epErrors.contract_number"`
);

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed planning modal');
