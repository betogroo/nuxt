const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/index.vue', 'utf8');

if (!code.includes('import { demandFormSchema }')) {
  code = code.replace(
    /import type \{ DemandRow \} from '~\/composables\/useDemands'/,
    "import type { DemandRow } from '~/composables/useDemands'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { demandFormSchema } from '~/schemas/forms/demand'"
  );
  fs.writeFileSync('app/pages/demands/index.vue', code, 'utf8');
  console.log('Fixed imports in index');
} else {
  console.log('Imports already present');
}
