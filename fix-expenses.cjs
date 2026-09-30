const fs = require('fs');
let s = fs.readFileSync('app/pages/admin/expense-natures.vue', 'utf8');
s = s.replace(/<template #actions>[\s\S]*?<\/template>/, '');
s = s.replace(/Lista de Naturezas de Despesa/, 'Lista de Naturezas de Despesa\n            <v-spacer />\n            <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="pending" size="small" variant="tonal" @click="refresh" />\n            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">Nova Natureza</UiButton>');
fs.writeFileSync('app/pages/admin/expense-natures.vue', s, 'utf8');
