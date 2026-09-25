const fs = require('fs');

const fixIndexVue = () => {
  const file = 'app/pages/demands/index.vue';
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Add process_number to modal initialization
  content = content.replace(
    /const modal = useModal<Partial<DemandRow>>\(\{ id: '', name: '', type: 'consumption' \}\)/,
    "const modal = useModal<Partial<DemandRow>>({ id: '', name: '', type: 'consumption', process_number: '' })"
  );
  
  // 2. Add process_number to payload in saveDemand
  content = content.replace(
    /const payload = {\s+name: modal\.payload\.value\.name!,\s+type: modal\.payload\.value\.type!,\s+}/,
    "const payload = {\n        name: modal.payload.value.name!,\n        type: modal.payload.value.type!,\n        process_number: modal.payload.value.process_number || null,\n      }"
  );
  
  // 3. Update the table column template for 'item-internal_process_number'
  // But wait, the header is currently `{ text: 'Processo', value: 'internal_process_number' }`. Let's just change the template.
  const oldTemplate = `<template #item-internal_process_number="{ item }">
              <span class="font-weight-medium text-grey-darken-1">{{ item.internal_process_number || '-' }}</span>
            </template>`;
            
  const newTemplate = `<template #item-internal_process_number="{ item }">
              <div v-if="item.process_number" class="font-weight-bold text-primary">{{ item.process_number }}</div>
              <div v-else class="text-caption text-grey font-italic">Sem n\u00BA oficial</div>
              <div class="text-caption text-grey-darken-1">Interno: {{ item.internal_process_number || '-' }}</div>
            </template>`;
            
  content = content.replace(oldTemplate, newTemplate);
  
  // 4. Add the input field to the modal form
  const oldModalForm = `<UiInput v-model="modal.payload.value.name" label="Nome da Demanda" />`;
  const newModalForm = `<UiInput v-model="modal.payload.value.name" label="Nome da Demanda" />

        <UiInput 
          v-model="modal.payload.value.process_number" 
          label="N\u00BA do Processo (Oficial)" 
          placeholder="Ex: 058.00100793/2026-21"
          hint="Opcional. Padr\u00E3o: XXX.XXXXXXXX/YYYY-ZZ"
        />`;
        
  content = content.replace(oldModalForm, newModalForm);
  
  fs.writeFileSync(file, content, 'utf8');
};

const fixDetailVue = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the card info content to show both
  const oldInfoCard = `<div class="text-caption text-grey">N\u00BA do Processo</div>
                  <div class="text-body-1 mb-3">{{ demand.internal_process_number || '-' }}</div>`;
                  
  const newInfoCard = `<div class="text-caption text-grey">Processo Oficial</div>
                  <div class="text-body-1 mb-3 font-weight-bold text-primary">{{ demand.process_number || 'Aguardando autua\u00E7\u00E3o' }}</div>
                  
                  <div class="text-caption text-grey">Processo Interno</div>
                  <div class="text-body-1 mb-3">{{ demand.internal_process_number || '-' }}</div>`;
                  
  content = content.replace(oldInfoCard, newInfoCard);
  
  fs.writeFileSync(file, content, 'utf8');
};

fixIndexVue();
fixDetailVue();
console.log('Frontend files updated.');
