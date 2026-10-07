const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

code = code.replace(
  /<UiSelect\s*v-model="responsibleUserId"\s*item-title="name"\s*item-value="id"\s*:items="availableProfiles"\s*label="[^"]+"\s*\/>/g,
  `<UiSelect
          v-model="responsibleUserId"
          v-bind="respUserIdProps"
          :error-messages="respErrors.user_id"
          item-title="name"
          item-value="id"
          :items="availableProfiles"
          label="Selecione o Usuário"
        />`
);

// We need to fix the eiProductIdProps error. Was it used?
// Wait, `eiProductId` wasn't used in the template yet because the "Add Product" modal is separate from "Edit Item" modal!
// Ah! "Edit Item" modal doesn't have a product selector! It only has quantity, reference_price, and searchUnitText!
// Let me verify if eiProductId is actually used in Edit Item modal.
