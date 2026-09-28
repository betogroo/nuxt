const fs = require('fs');
let file = 'app/pages/demands/[id]/index.vue';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/:item-title="\(item\) => typeof item === 'object' && item !== null \? `\{item\.id\} - \{item\.name\}` : ''"/g, ':item-title="(item) => typeof item === \\'object\\' && item !== null ? \\`${item.id} - ${item.name}\\` : \\'\\'"');
fs.writeFileSync(file, content, 'utf8');
