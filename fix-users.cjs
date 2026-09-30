const fs = require('fs');
let s = fs.readFileSync('app/pages/users.vue', 'utf8');
s = s.replace(/<template #actions>[\s\S]*?<\/template>/, '');
s = s.replace(/<v-text-field\s*v-model="searchQuery"\s*clearable\s*density="compact"\s*hide-details\s*placeholder="Buscar usuário\.\.\."\s*prepend-inner-icon="mdi-magnify"\s*variant="outlined"\s*style="max-width: 300px"\s*\/>/, '<v-text-field\n            v-model="searchQuery"\n            clearable\n            density="compact"\n            hide-details\n            placeholder="Buscar usuário..."\n            prepend-inner-icon="mdi-magnify"\n            variant="outlined"\n            style="max-width: 300px"\n          />\n          <UiButton class="ml-4 mr-2" color="secondary" icon="mdi-refresh" :loading="pending" size="small" variant="tonal" @click="refresh" />\n          <UiButton color="primary" prepend-icon="mdi-account-plus" @click="openAddModal">Novo Usuário</UiButton>');
fs.writeFileSync('app/pages/users.vue', s, 'utf8');
