const fs = require('fs');
let s = fs.readFileSync('app/pages/iirgd/index.vue', 'utf8');
s = s.replace(/<template #actions>[\s\S]*?<\/template>/, '');
s = s.replace(/<v-chip v-if="demands\?\.length" class="ml-2" label size="x-small" variant="tonal">\s*\{\{ demands\.length \}\}\s*<\/v-chip>/, '<v-chip v-if="demands?.length" class="ml-2" label size="x-small" variant="tonal">\n          {{ demands.length }}\n        </v-chip>\n        <v-spacer />\n        <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="pending" size="small" variant="tonal" @click="refresh" />\n        <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">Nova Demanda</UiButton>');
fs.writeFileSync('app/pages/iirgd/index.vue', s, 'utf8');
