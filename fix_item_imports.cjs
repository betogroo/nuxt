const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/items/[itemId].vue', 'utf8');

code = code.replace(
  "definePageMeta({ middleware: ['uge'] })",
  "import { useZodForm } from '~/composables/useZodForm'\n  import { demandItemFormSchema } from '~/schemas/forms/demand-item'\n  import { demandBidFormSchema } from '~/schemas/forms/demand-bid'\n  definePageMeta({ middleware: ['uge'] })"
);

fs.writeFileSync('app/pages/demands/[id]/items/[itemId].vue', code, 'utf8');
console.log('Fixed item imports');
