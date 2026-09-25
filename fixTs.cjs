const fs = require('fs');

const fixTypescriptDetail = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // Fix the v-if statements to use demand?.status
  content = content.replace(
    /<UiCard v-if="demand\.status !== 'planning' && demand\.status !== 'quotation'" title="Dados da Disputa e Contrata\u00E7\u00E3o" variant="outlined">/,
    `<UiCard v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'" title="Dados da Disputa e Contrata\u00E7\u00E3o" variant="outlined">`
  );
  
  content = content.replace(
    /<UiButton\s*v-if="demand\.status !== 'planning'"/g,
    `<UiButton\n          v-if="demand?.status !== 'planning'"`
  );
  
  content = content.replace(
    /<v-alert\s*v-if="demand\.status === 'planning'"/g,
    `<v-alert\n        v-if="demand?.status === 'planning'"`
  );

  fs.writeFileSync(file, content, 'utf8');
};

fixTypescriptDetail();
console.log('Typescript errors in template fixed.');
