const fs = require('fs');

const fixAddButton = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // Fix the "Adicionar Produto" button
  const buttonRegex = /<UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">\s*Adicionar Produto\s*<\/UiButton>/;
  
  const buttonReplacement = `<UiButton v-if="demand?.status !== 'planning'" color="primary" prepend-icon="mdi-plus" @click="openAddModal">\n            Adicionar Produto\n          </UiButton>`;
          
  content = content.replace(buttonRegex, buttonReplacement);

  fs.writeFileSync(file, content, 'utf8');
};

fixAddButton();
console.log('Add Button fixed.');
