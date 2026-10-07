const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

code = code.replace(
  "import { ROLES } from '~/constants/roles'",
  "import { ROLES } from '~/constants/roles'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { demandFormSchema, demandResponsibleSchema } from '~/schemas/forms/demand'\n  import { demandItemFormSchema } from '~/schemas/forms/demand-item'\n  import { demandAdvanceSchema } from '~/schemas/forms/demand-advance'"
);

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed imports');
