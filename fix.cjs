const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\(item\) => \$`\{item\.id\}` - \$`\{item\.name\}`"/g, '(item) => `${item.id} - ${item.name}`"');
  content = content.replace(/\(item\) => \$`\{item\.id\}` - \$`\{item\.name\}"/g, '(item) => `${item.id} - ${item.name}`"');
  content = content.replace(/\(item\) => \$\`\{item\.id\`\} - \$\`\{item\.name\`\}"/g, '(item) => `${item.id} - ${item.name}`"');
  fs.writeFileSync(file, content, 'utf8');
}

fixFile('app/pages/demands/[id]/index.vue');
