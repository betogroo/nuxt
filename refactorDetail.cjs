const fs = require('fs');

const refactorDetailVue = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add isPlanningIncomplete to <script setup>
  const scriptTarget = `const demandId = route.params.id as string`;
  const scriptReplacement = `const demandId = route.params.id as string

  // Verifica se o planejamento est\u00E1 incompleto (faltando campos obrigat\u00F3rios para avan\u00E7ar)
  const isPlanningIncomplete = computed(() => {
    if (demand.value?.status !== 'planning') return false
    const { process_number, id_pca, contract_number } = demand.value
    return !process_number || !id_pca || !contract_number
  })`;
  content = content.replace(scriptTarget, scriptReplacement);

  // 2. Add disabled state to "Avançar" button and tooltips
  const buttonTarget = `<UiButton
              v-if="getNextStatus(demand.status)"
              color="success"
              prepend-icon="mdi-arrow-right-bold"
              @click="openAdvanceModal"
            >
              Avan\u00E7ar para {{ formatDemandStatus(getNextStatus(demand.status) || '') }}
            </UiButton>`;
            
  const buttonReplacement = `<v-tooltip v-if="getNextStatus(demand.status)" text="Preencha todos os Dados do Planejamento para avan\u00E7ar" :disabled="!isPlanningIncomplete">
              <template #activator="{ props }">
                <span v-bind="props">
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
  content = content.replace(buttonTarget, buttonReplacement);
  
  // 3. Fix the template grid grouping (Dados do Planejamento / Disputa)
  // Find everything between <v-row> <v-col cols="12" md="8"> <v-row> and <!-- Responsáveis -->
  const gridRegex = /<v-row>[\s\S]*?(?=<!-- Respons\u00E1veis -->)/;
  
  const newGrid = `<v-row>
        <v-col cols="12" md="8">
          
          <!-- Dados do Planejamento -->
          <UiCard title="Dados do Planejamento" class="mb-4" variant="outlined">
            <v-row class="px-2 pb-2 mt-2">
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">Processo Oficial</div>
                <div class="text-body-1 font-weight-bold text-primary">
                  {{ demand.process_number || 'Aguardando autua\u00E7\u00E3o' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">Processo Interno</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.internal_process_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">ID PCA</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.id_pca || '-' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">Tipo</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">N\u00BA da Contrata\u00E7\u00E3o</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.contract_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12">
                <v-alert v-if="isPlanningIncomplete" type="warning" density="compact" variant="tonal" class="mt-2 text-caption">
                  Para avan\u00E7ar para a Cota\u00E7\u00E3o, preencha os dados do planejamento (Processo Oficial, ID PCA e N\u00BA Contrata\u00E7\u00E3o).
                  <br/>
                  <small>Voc\u00EA pode editar a demanda voltando \u00E0 tela de listagem.</small>
                </v-alert>
              </v-col>
            </v-row>
          </UiCard>

          <!-- Dados da Disputa -->
          <UiCard v-if="demand.status !== 'planning' && demand.status !== 'quotation'" title="Dados da Disputa e Contrata\u00E7\u00E3o" variant="outlined">
            <v-row class="px-2 pb-2 mt-2">
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">Aviso de Contrata\u00E7\u00E3o</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.bidding_notice_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">N\u00BA Disputa</div>
                <div class="text-body-1">
                  {{ demand.dispute_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">Data da Disputa</div>
                <div class="text-body-1">
                  {{ demand.dispute_date ? new Date(demand.dispute_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-grey">Abertura de Ofertas</div>
                <div class="text-body-1">
                  {{ demand.offer_opening_date ? new Date(demand.offer_opening_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-' }}
                </div>
              </v-col>
            </v-row>
          </UiCard>

        </v-col>

        `;
  
  content = content.replace(gridRegex, newGrid);

  // 4. Update "Inserir Produto" button logic
  const itemsHeaderTarget = `<span class="text-subtitle-1 font-weight-bold">Itens da Demanda</span>
        <v-spacer />
        <UiButton
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openModal()"
        >
          Inserir Produto
        </UiButton>`;
        
  const itemsHeaderReplacement = `<span class="text-subtitle-1 font-weight-bold">Itens da Demanda</span>
        <v-spacer />
        <UiButton
          v-if="demand.status !== 'planning'"
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openModal()"
        >
          Inserir Produto
        </UiButton>`;
        
  content = content.replace(itemsHeaderTarget, itemsHeaderReplacement);

  // 5. Add alert before the table
  const tableTarget = `<UiTable
        :headers="[`;
  
  const tableReplacement = `<!-- Alerta de bloqueio na fase de planejamento -->
      <v-alert
        v-if="demand.status === 'planning'"
        type="info"
        variant="tonal"
        class="mb-4"
        density="compact"
      >
        A inser\u00E7\u00E3o de itens (produtos) s\u00F3 \u00E9 permitida ap\u00F3s a conclus\u00E3o da fase de planejamento.
      </v-alert>

      <UiTable
        :headers="[`;
        
  content = content.replace(tableTarget, tableReplacement);

  fs.writeFileSync(file, content, 'utf8');
};

refactorDetailVue();
console.log('Detail vue refactored.');
