const fs = require('fs');

const fixIndexVue = () => {
  const file = 'app/pages/demands/index.vue';
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Update modal payload
  content = content.replace(
    /const modal = useModal<Partial<DemandRow>>\(\{ id: '', name: '', type: 'consumption', process_number: '' \}\)/,
    "const modal = useModal<Partial<DemandRow>>({ id: '', name: '', type: 'consumption', process_number: '', id_pca: '' })"
  );
  
  // 2. Update saveDemand payload
  content = content.replace(
    /process_number: modal\.payload\.value\.process_number \|\| null,/,
    "process_number: modal.payload.value.process_number || null,\n        id_pca: modal.payload.value.id_pca || null,"
  );
  
  // 3. Reorder the form fields
  const oldForm = `<UiInput v-model="modal.payload.value.name" label="Nome da Demanda" />

        <UiInput 
          v-model="modal.payload.value.process_number" 
          label="N\u00BA do Processo (Oficial)" 
          placeholder="Ex: 058.00100793/2026-21"
          hint="Opcional. Padr\u00E3o: XXX.XXXXXXXX/YYYY-ZZ"
        />

        <UiSelect
          v-model="modal.payload.value.type"
          item-title="title"
          item-value="value"
          :items="[
            { title: 'Consumo', value: 'consumption' },
            { title: 'Permanente', value: 'permanent' },
          ]"
          label="Tipo"
        />`;
        
  const newForm = `<UiInput v-model="modal.payload.value.name" label="Nome da Demanda*" required />

        <UiSelect
          v-model="modal.payload.value.type"
          item-title="title"
          item-value="value"
          :items="[
            { title: 'Consumo', value: 'consumption' },
            { title: 'Permanente', value: 'permanent' },
          ]"
          label="Tipo*"
          required
        />

        <UiInput 
          v-model="modal.payload.value.process_number" 
          label="N\u00BA do Processo (Oficial)" 
          placeholder="Ex: 058.00100793/2026-21"
          hint="Opcional. Padr\u00E3o: XXX.XXXXXXXX/YYYY-ZZ"
        />

        <UiInput 
          v-model="modal.payload.value.id_pca" 
          label="ID PCA" 
          placeholder="Ex: 46377800000127-0-000132/2026"
          hint="Opcional. ID do Plano de Contrata\u00E7\u00F5es Anual"
        />`;
        
  content = content.replace(oldForm, newForm);
  
  fs.writeFileSync(file, content, 'utf8');
};

const fixDetailVue = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the detail header to include ID PCA
  const target = `<v-col cols="12" sm="4">
              <div class="text-caption text-grey">Processo Interno</div>`;
              
  const replacement = `<v-col cols="12" sm="4">
              <div class="text-caption text-grey">ID PCA</div>
              <div class="text-body-1 font-weight-medium">
                {{ demand.id_pca || '-' }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Processo Interno</div>`;
              
  content = content.replace(target, replacement);
  
  fs.writeFileSync(file, content, 'utf8');
};

fixIndexVue();
fixDetailVue();
console.log('Frontend files updated.');
