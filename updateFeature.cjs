const fs = require('fs');
const path = require('path');

// 1. Update useExpenseNatures.ts
const composablePath = path.join('app', 'composables', 'useExpenseNatures.ts');
let composableContent = fs.readFileSync(composablePath, 'utf8');

const toggleFn = `
  const toggleExpenseNatureStatus = async (expenseNature: ExpenseNatureRow) => {
    const newStatus = !expenseNature.is_active
    const { error } = await supabase
      .from('expense_natures')
      .update({ is_active: newStatus })
      .eq('id', expenseNature.id)

    if (error) throw error

    await logAction(
      'TOGGLE_EXPENSE_NATURE_STATUS',
      \`Status da Natureza de Despesa \${expenseNature.id} alterado para \${newStatus ? 'Ativo' : 'Inativo'}\`,
      user.value?.id,
    )
  }
`;

composableContent = composableContent.replace(
  /const updateExpenseNature =/g,
  `${toggleFn}\n  const updateExpenseNature =`
);

composableContent = composableContent.replace(
  /deleteExpenseNature,\n  }/g,
  `deleteExpenseNature,\n    toggleExpenseNatureStatus,\n  }`
);

fs.writeFileSync(composablePath, composableContent, 'utf8');

// 2. Update admin/expense-natures.vue
const vuePath = path.join('app', 'pages', 'admin', 'expense-natures.vue');
let vueContent = fs.readFileSync(vuePath, 'utf8');

vueContent = vueContent.replace(
  /deleteExpenseNature\n  } = useExpenseNatures\(\)/,
  `deleteExpenseNature,\n    toggleExpenseNatureStatus\n  } = useExpenseNatures()`
);

const toggleMethod = `
  const toggleStatus = async (item: ExpenseNatureRow) => {
    try {
      await toggleExpenseNatureStatus(item)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const deleteNature = async`;

vueContent = vueContent.replace(/const deleteNature = async/, toggleMethod);

const oldChip = `<UiChip :color="item.is_active ? 'success' : 'error'" size="small">\n                {{ item.is_active ? 'Ativo' : 'Inativo' }}\n              </UiChip>`;
const newChip = `<v-tooltip text="Clique para ativar/desativar" location="top">
                <template #activator="{ props }">
                  <span v-bind="props">
                    <UiChip
                      :color="item.is_active ? 'success' : 'error'"
                      size="small"
                      style="cursor: pointer"
                      @click="toggleStatus(item)"
                    >
                      {{ item.is_active ? 'Ativo' : 'Inativo' }}
                    </UiChip>
                  </span>
                </template>
              </v-tooltip>`;

vueContent = vueContent.replace(oldChip, newChip);

fs.writeFileSync(vuePath, vueContent, 'utf8');

console.log('UseExpenseNatures and expense-natures.vue updated.');
