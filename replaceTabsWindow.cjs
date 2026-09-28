const fs = require('fs');
const path = require('path');

const vuePath = path.join('app', 'pages', 'admin', 'units.vue');
let content = fs.readFileSync(vuePath, 'utf8');

content = content.replace(/<v-window /g, '<v-tabs-window ');
content = content.replace(/<\/v-window>/g, '</v-tabs-window>');
content = content.replace(/<v-window-item /g, '<v-tabs-window-item ');
content = content.replace(/<\/v-window-item>/g, '</v-tabs-window-item>');

fs.writeFileSync(vuePath, content, 'utf8');
console.log('v-window replaced with v-tabs-window');
