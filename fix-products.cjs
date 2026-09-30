const fs = require('fs');
let s = fs.readFileSync('app/pages/products/index.vue', 'utf8');
s = s.replace(/<template #actions>[\s\S]*?<\/template>/, '');
s = s.replace(/<div class="d-flex gap-2">/, '<div class="d-flex gap-2 align-center">\n            <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="pending" size="small" variant="tonal" @click="refresh" />\n            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">Novo Produto</UiButton>\n            <v-divider vertical class="mx-2" />\n            <div class="d-flex gap-2">');
fs.writeFileSync('app/pages/products/index.vue', s, 'utf8');
