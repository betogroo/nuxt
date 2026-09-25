const fs = require('fs');

const fixIndexVue = () => {
  const file = 'app/pages/demands/index.vue';
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Update modal payload
  content = content.replace(
    /const modal = useModal<Partial<DemandRow>>\(\{ id: '', name: '', type: 'consumption', process_number: '', id_pca: '' \}\)/,
    "const modal = useModal<Partial<DemandRow>>({ id: '', name: '', type: 'consumption', process_number: '', id_pca: '', contract_number: '' })"
  );
  
  // 2. Update saveDemand payload
  content = content.replace(
    /id_pca: modal\.payload\.value\.id_pca \|\| null,/,
    "id_pca: modal.payload.value.id_pca || null,\n        contract_number: modal.payload.value.contract_number ? String(modal.payload.value.contract_number) : null,"
  );
  
  // 3. Add to the template
  const targetForm = `<UiInput 
          v-model="modal.payload.value.id_pca" 
          label="ID PCA" 
          placeholder="Ex: 46377800000127-0-000132/2026"
          hint="Opcional. ID do Plano de Contrata\u00E7\u00F5es Anual"
        />`;
        
  const newForm = `<UiInput 
          v-model="modal.payload.value.id_pca" 
          label="ID PCA" 
          placeholder="Ex: 46377800000127-0-000132/2026"
          hint="Opcional. ID do Plano de Contrata\u00E7\u00F5es Anual"
        />
        
        <UiInput 
          v-model="modal.payload.value.contract_number" 
          label="N\u00BA da Contrata\u00E7\u00E3o" 
          placeholder="Apenas n\u00FAmeros"
          type="number"
          hint="Opcional. N\u00FAmero da contrata\u00E7\u00E3o."
        />`;
        
  content = content.replace(targetForm, newForm);
  
  fs.writeFileSync(file, content, 'utf8');
};

fixIndexVue();
console.log('index.vue updated.');
