const fs = require('fs');

const refactorDetailVuePart2 = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // Fix advance button
  const buttonRegex = /<UiButton\s*v-if="getNextStatus\(demand\.status\)"\s*color="success"\s*prepend-icon="mdi-arrow-right-bold"\s*@click="openAdvanceModal"\s*>\s*Avan\u00E7ar para \{\{ formatDemandStatus\(getNextStatus\(demand\.status\) \|\| ''\) \}\}\s*<\/UiButton>/;
  
  const buttonReplacement = `<v-tooltip v-if="getNextStatus(demand.status)" text="Preencha todos os Dados do Planejamento para avan\u00E7ar" :disabled="!isPlanningIncomplete">
            <template #activator="{ props }">
              <span v-bind="props" class="d-inline-block">
                <UiButton
                  color="success"
                  prepend-icon="mdi-arrow-right-bold"
                  :disabled="isPlanningIncomplete"
                  @click="openAdvanceModal"
                >
                  Avan\u00E7ar para {{ formatDemandStatus(getNextStatus(demand.status) || '') }}
                </UiButton>
              </span>
            </template>
          </v-tooltip>`;
          
  content = content.replace(buttonRegex, buttonReplacement);
  
  // Fix "Inserir Produto" button
  const insertButtonRegex = /<UiButton\s*color="primary"\s*prepend-icon="mdi-plus"\s*size="small"\s*@click="openModal\(\)"\s*>\s*Inserir Produto\s*<\/UiButton>/;
  
  const insertButtonReplacement = `<UiButton
          v-if="demand.status !== 'planning'"
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openModal()"
        >
          Inserir Produto
        </UiButton>`;
        
  content = content.replace(insertButtonRegex, insertButtonReplacement);

  fs.writeFileSync(file, content, 'utf8');
};

refactorDetailVuePart2();
console.log('Detail vue buttons refactored.');
