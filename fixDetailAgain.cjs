const fs = require('fs');

const fixDetailVueAgain = () => {
  const file = 'app/pages/demands/[id]/index.vue';
  let content = fs.readFileSync(file, 'utf8');

  // Fix the UiCard header
  const target = /<UiCard class="mb-4" title="Dados do Planejamento" variant="outlined">/;
  const replacement = `<UiCard class="mb-4" variant="outlined">
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
  content = content.replace(target, replacement);

  // Replace ts-ignore
  content = content.replace(/@ts-ignore/g, '@ts-expect-error');

  // Replace catch (err: any)
  content = content.replace(/catch \(err: any\)/g, 'catch (err: unknown)');

  // Ensure err.message works
  content = content.replace(/editPlanningModal\.error\.value = err\.message/g, 'editPlanningModal.error.value = err instanceof Error ? err.message : String(err)');

  fs.writeFileSync(file, content, 'utf8');
};

fixDetailVueAgain();
console.log('Fixed detail template and eslint.');
