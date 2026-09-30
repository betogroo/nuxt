const fs = require('fs');
let s = fs.readFileSync('app/pages/admin/units.vue', 'utf8');
s = s.replace(/<template #actions>[\s\S]*?<\/template>/, '');
s = s.replace(/Unidades de Medida Oficiais/, 'Unidades de Medida Oficiais\n            <v-spacer />\n            <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="unitsPending" size="small" variant="tonal" @click="refreshUnits" />\n            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">Nova Unidade</UiButton>');
s = s.replace(/Todos os Registros Alternativos/, 'Todos os Registros Alternativos\n            <v-spacer />\n            <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="aliasesPending" size="small" variant="tonal" @click="refreshAliases" />\n            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddAliasModal">Novo Registro</UiButton>');
fs.writeFileSync('app/pages/admin/units.vue', s, 'utf8');
