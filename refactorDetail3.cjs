const fs = require('fs');

const refactorDetailAgain = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add updateDemand to useDemands()
  content = content.replace(
    /removeResponsible: removeResponsibleDb,/,
    `removeResponsible: removeResponsibleDb,\n    updateDemand,`
  );

  // 2. Add the modal logic in script setup
  const scriptInsertion = `
  // Modal de Edição Rápida de Planejamento
  const editPlanningModal = useModal<Partial<Database['public']['Tables']['demands']['Row']>>({ 
    name: '', type: 'consumption', process_number: '', id_pca: '', contract_number: '' 
  })
  
  const openEditPlanning = () => {
    if (demand.value) {
      editPlanningModal.open({
        name: demand.value.name,
        type: demand.value.type,
        process_number: demand.value.process_number || '',
        id_pca: demand.value.id_pca || '',
        contract_number: demand.value.contract_number || '',
      })
    }
  }

  const savePlanning = async () => {
    editPlanningModal.startSaving()
    try {
      const payload = {
        name: editPlanningModal.payload.value.name,
        type: editPlanningModal.payload.value.type,
        process_number: editPlanningModal.payload.value.process_number || null,
        id_pca: editPlanningModal.payload.value.id_pca || null,
        contract_number: editPlanningModal.payload.value.contract_number ? String(editPlanningModal.payload.value.contract_number) : null
      }
      // @ts-ignore
      await updateDemand(demandId, payload)
      const { refresh: refDmd } = useAsyncData(\`demand-\${demandId}\`, async () => fetchDemandById(demandId))
      await refDmd()
      editPlanningModal.close()
      // Hard reload para garantir reatividade
      window.location.reload()
    } catch (err: any) {
      editPlanningModal.error.value = err.message
    } finally {
      editPlanningModal.stopSaving()
    }
  }
`;
  
  content = content.replace(
    /const demandId = route.params.id as string/,
    `const demandId = route.params.id as string\n${scriptInsertion}`
  );

  // 3. Fix contrast of warning buttons
  // "Retornar para"
  content = content.replace(
    /color="warning"/g,
    `color="orange-darken-3"`
  );
  
  // Replace the warning alert in planning
  content = content.replace(
    /<v-alert v-if="isPlanningIncomplete" type="warning" density="compact" variant="tonal" class="mt-2 text-caption">/g,
    `<v-alert v-if="isPlanningIncomplete" type="warning" density="compact" variant="flat" class="mt-2 text-caption bg-orange-lighten-4 text-orange-darken-4">`
  );

  // 4. Update the "Dados do Planejamento" Card to have an Edit button
  const planningCardOld = /<UiCard title="Dados do Planejamento" class="mb-4" variant="outlined">/;
  const planningCardNew = `<UiCard class="mb-4" variant="outlined">
            <template #header>
              <div class="d-flex align-center w-100">
                <v-icon left class="mr-2 text-primary">mdi-clipboard-text-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold">Dados do Planejamento</span>
                <v-spacer />
                <UiButton 
                  v-if="demand?.status === 'planning'" 
                  size="small" 
                  variant="text" 
                  color="primary" 
                  prepend-icon="mdi-pencil"
                  @click="openEditPlanning"
                >
                  Editar
                </UiButton>
              </div>
            </template>`;
  content = content.replace(planningCardOld, planningCardNew);

  // Add icons to the Dispute card too
  const disputeCardOld = /<UiCard v-if="demand\?.status !== 'planning' && demand\?.status !== 'quotation'" title="Dados da Disputa e Contrata\u00E7\u00E3o" variant="outlined">/;
  const disputeCardNew = `<UiCard v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'" variant="outlined">
            <template #header>
              <div class="d-flex align-center w-100">
                <v-icon left class="mr-2 text-primary">mdi-gavel</v-icon>
                <span class="text-subtitle-1 font-weight-bold">Dados da Disputa e Contrata\u00E7\u00E3o</span>
              </div>
            </template>`;
  content = content.replace(disputeCardOld, disputeCardNew);

  // 5. Append the modal HTML at the end of the template
  const modalHtml = `
      <!-- Modal Editar Planejamento -->
      <v-dialog v-model="editPlanningModal.isOpen.value" max-width="500px">
        <UiCard title="Editar Planejamento" transparent-header>
          <v-alert v-if="editPlanningModal.error.value" class="mb-4" density="compact" type="error" variant="tonal">
            {{ editPlanningModal.error.value }}
          </v-alert>

          <UiInput v-model="editPlanningModal.payload.value.name" label="Nome da Demanda*" required />

          <UiSelect
            v-model="editPlanningModal.payload.value.type"
            item-title="title"
            item-value="value"
            :items="[
              { title: 'Consumo', value: 'consumption' },
              { title: 'Permanente', value: 'permanent' },
            ]"
            label="Tipo*"
            required
          />

          <UiInput 
            v-model="editPlanningModal.payload.value.process_number" 
            label="N\u00BA do Processo (Oficial)" 
            placeholder="Ex: 058.00100793/2026-21"
            hint="Opcional. Padr\u00E3o: XXX.XXXXXXXX/YYYY-ZZ"
          />

          <UiInput 
            v-model="editPlanningModal.payload.value.id_pca" 
            label="ID PCA" 
            placeholder="Ex: 46377800000127-0-000132/2026"
            hint="Opcional."
          />
          
          <UiInput 
            v-model="editPlanningModal.payload.value.contract_number" 
            label="N\u00BA da Contrata\u00E7\u00E3o" 
            type="number"
            placeholder="Apenas n\u00FAmeros"
            hint="Opcional."
          />

          <template #actions>
            <UiButton :disabled="editPlanningModal.isSaving.value" variant="text" @click="editPlanningModal.close()">Cancelar</UiButton>
            <UiButton color="primary" :loading="editPlanningModal.isSaving.value" @click="savePlanning">Salvar</UiButton>
          </template>
        </UiCard>
      </v-dialog>
    </v-container>
</template>`;

  content = content.replace(/<\/v-container>\s*<\/template>/, modalHtml);

  fs.writeFileSync(file, content, 'utf8');
};

refactorDetailAgain();
console.log('Detail page elegant refactored.');
