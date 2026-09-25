const fs = require('fs');

const fixDetailVue = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');
  
  // Find <v-row> inside the <v-col cols="12" md="8">
  const target = `<v-col cols="12" sm="4">
              <div class="text-caption text-grey">Tipo</div>`;
              
  const replacement = `<v-col cols="12" sm="4">
              <div class="text-caption text-grey">Processo Oficial</div>
              <div class="text-body-1 font-weight-bold text-primary">
                {{ demand.process_number || 'Aguardando autua\u00E7\u00E3o' }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Processo Interno</div>
              <div class="text-body-1 font-weight-medium">
                {{ demand.internal_process_number || '-' }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Tipo</div>`;
              
  content = content.replace(target, replacement);
  
  fs.writeFileSync(file, content, 'utf8');
};

fixDetailVue();
console.log('Detail page fixed.');
