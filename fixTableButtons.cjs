const fs = require('fs');

const fixTableButtons = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // Fix Edit button visibility
  content = content.replace(
    /v-if="demand\?\.status === 'planning' \|\| demand\?\.status === 'quotation'"/g,
    `v-if="demand?.status === 'quotation'"`
  );
  
  // Fix Remove button visibility
  const removeBtnRegex = /<UiButton\s*v-if="demand\?\.status === 'planning'"\s*color="error"\s*icon="mdi-delete"/;
  content = content.replace(removeBtnRegex, `<UiButton\n              v-if="demand?.status === 'quotation'"\n              color="error"\n              icon="mdi-delete"`);

  fs.writeFileSync(file, content, 'utf8');
};

fixTableButtons();
console.log('Table buttons fixed.');
