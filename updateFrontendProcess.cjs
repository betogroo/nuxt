const fs = require('fs');

const fixTypes = () => {
  const typesFile = 'app/types/index.ts';
  if (fs.existsSync(typesFile)) {
    let content = fs.readFileSync(typesFile, 'utf8');
    content = content.replace('id: string\n  description', 'id: string\n  internal_process_number?: string\n  description');
    fs.writeFileSync(typesFile, content, 'utf8');
  }
};

const fixDemandsIndex = () => {
  const indexFile = 'app/pages/demands/index.vue';
  let content = fs.readFileSync(indexFile, 'utf8');
  
  const oldHeaders = `:headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Tipo', value: 'type' },`;
  
  const newHeaders = `:headers="[
              { text: 'Processo', value: 'internal_process_number' },
              { text: 'Nome', value: 'name' },
              { text: 'Tipo', value: 'type' },`;
              
  content = content.replace(oldHeaders, newHeaders);
  
  const oldEmpty = `<template v-if="!demands?.length && !pending" #empty>`;
  const newItemTemplate = `<template #item-internal_process_number="{ item }">
              <span class="font-weight-medium text-grey-darken-1">{{ item.internal_process_number || '-' }}</span>
            </template>
            <template v-if="!demands?.length && !pending" #empty>`;
            
  content = content.replace(oldEmpty, newItemTemplate);
  
  fs.writeFileSync(indexFile, content, 'utf8');
};

const fixDemandsDetail = () => {
  const detailFile = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(detailFile, 'utf8');
  
  // Replace the subtitle to include process number
  const oldSubtitle = `:subtitle="\`Detalhes e planejamento \${demand?.type === 'consumption' ? '(Consumo)' : '(Permanente)'}\`"`;
  const newSubtitle = `:subtitle="\`\${demand?.internal_process_number ? 'Processo ' + demand.internal_process_number + ' | ' : ''}Detalhes e planejamento \${demand?.type === 'consumption' ? '(Consumo)' : '(Permanente)'}\`"`;
  
  content = content.replace(oldSubtitle, newSubtitle);
  
  // Also we could add it to the top info card
  const oldInfoCard = `<div class="text-caption text-grey">Data de Cria\u00E7\u00E3o</div>`;
  const newInfoCard = `<div class="text-caption text-grey">N\u00BA do Processo</div>
                  <div class="text-body-1 mb-3">{{ demand.internal_process_number || '-' }}</div>
                  <div class="text-caption text-grey">Data de Cria\u00E7\u00E3o</div>`;
                  
  content = content.replace(oldInfoCard, newInfoCard);
  
  fs.writeFileSync(detailFile, content, 'utf8');
};

fixTypes();
fixDemandsIndex();
fixDemandsDetail();
console.log('Frontend updated.');
