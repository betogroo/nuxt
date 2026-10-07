const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

code = code.replace(
  /const \[eiProductId, eiProductIdProps\] = eiDefine\('productId'\)/,
  "const [eiProductId] = eiDefine('productId')"
);

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

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed unused and select');
