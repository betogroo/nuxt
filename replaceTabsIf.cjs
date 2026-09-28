const fs = require('fs');
const path = require('path');

const vuePath = path.join('app', 'pages', 'admin', 'units.vue');
let content = fs.readFileSync(vuePath, 'utf8');

// Replace v-tabs-window/v-window with v-if
content = content.replace(/<v-tabs-window v-model="activeTab">/, '<div class="mt-4">');
content = content.replace(/<\/v-tabs-window>/, '</div>');

content = content.replace(/<v-tabs-window-item value="units">/, '<div v-if="activeTab === \'units\'">');
content = content.replace(/<\/v-tabs-window-item>/g, '</div>');

content = content.replace(/<v-tabs-window-item value="aliases">/, '<div v-if="activeTab === \'aliases\'">');

fs.writeFileSync(vuePath, content, 'utf8');
console.log('Tabs fixed');
