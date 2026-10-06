const fs = require('fs');
const file = 'app/pages/iirgd/index.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Add isValidCpf to import
content = content.replace("isValidRgSP }", "isValidRgSP, isValidCpf }");

// 2. Import useIirgdCitizens
content = content.replace("const { fetchDemands, createDemand } = useIirgdDemands()", "const { fetchDemands, createDemand } = useIirgdDemands()\n  const { fetchCitizenByDocument } = useIirgdCitizens()");

// 3. Add existingCitizen state
content = content.replace("  const activeTab = ref('em_andamento')", "  const existingCitizen = ref<any>(null)\n  const activeTab = ref('em_andamento')");

// 4. Update openAddModal to reset existingCitizen
content = content.replace("modal.value.error = ''", "modal.value.error = ''\n    existingCitizen.value = null");

// 5. Update onRgBlur and onCpfInput, adding onCpfBlur and the new logic
const blurLogic = `
  const onRgBlur = async () => {
    let rg = modal.value.payload.rg || ''
    rg = padAndFormatRg(rg, true)
    modal.value.payload.rg = rg

    if (!rg && !modal.value.payload.cpf) {
      existingCitizen.value = null
      return
    }

    if (rg && isValidRgSP(rg)) {
      try {
        const citizen = await fetchCitizenByDocument('rg', rg)
        if (citizen) {
          existingCitizen.value = citizen
          modal.value.payload.name = citizen.name
          if (citizen.cpf) modal.value.payload.cpf = formatCpf(citizen.cpf)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const onCpfInput = (val: string | null) => {
    if (val !== null) {
      modal.value.payload.cpf = formatCpf(val)
    }
  }

  const onCpfBlur = async () => {
    let cpf = modal.value.payload.cpf || ''
    cpf = formatCpf(cpf)
    modal.value.payload.cpf = cpf

    if (!cpf && !modal.value.payload.rg) {
      existingCitizen.value = null
      return
    }

    if (cpf && isValidCpf(cpf)) {
      try {
        const citizen = await fetchCitizenByDocument('cpf', cpf)
        if (citizen) {
          existingCitizen.value = citizen
          modal.value.payload.name = citizen.name
          if (citizen.rg) modal.value.payload.rg = padAndFormatRg(citizen.rg, true)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
`;

content = content.replace(/  const onRgBlur = \(\) => \{\s*modal\.value\.payload\.rg = padAndFormatRg\(modal\.value\.payload\.rg, true\)( \/\/ Pad on blur)?\s*\}\s*const onCpfInput = \(val: string \| null\) => \{\s*if \(val !== null\) \{\s*modal\.value\.payload\.cpf = formatCpf\(val\)\s*\}\s*\}/, blurLogic);

// 6. Fix CPF validation in saveDemand
const validateRg = `      if (p.rg) {
        p.rg = padAndFormatRg(p.rg, true)
        if (!isValidRgSP(p.rg)) {
          throw new Error('O RG informado é inválido ou seu dígito verificador não confere.')
        }
      }

      if (p.cpf) {
        p.cpf = formatCpf(p.cpf)
        if (!isValidCpf(p.cpf)) {
          throw new Error('O CPF informado é inválido.')
        }
      }`;
      
content = content.replace(/      if \(p\.rg\) \{\s*p\.rg = padAndFormatRg\(p\.rg, true\)\s*if \(\!isValidRgSP\(p\.rg\)\) \{\s*throw new Error\('.*?'\)\s*\}\s*\}/, validateRg);

// 7. Template UI changes: add disabled prop to name, rg, cpf
content = content.replace(/label="Nome"\n\s*v-model="modal\.payload\.name"/, `label="Nome"\n              v-model="modal.payload.name"\n              :disabled="!!existingCitizen"`);
content = content.replace(/label="RG"\n\s*:model-value="modal\.payload\.rg"/, `label="RG"\n              :model-value="modal.payload.rg"\n              :disabled="!!existingCitizen?.rg"`);
content = content.replace(/label="CPF"\n\s*:model-value="modal\.payload\.cpf"/, `label="CPF"\n              :model-value="modal.payload.cpf"\n              :disabled="!!existingCitizen?.cpf"\n              @blur="onCpfBlur"`);

fs.writeFileSync(file, content, 'utf8');
