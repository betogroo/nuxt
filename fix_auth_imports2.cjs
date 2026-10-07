const fs = require('fs');

let loginCode = fs.readFileSync('app/pages/login.vue', 'utf8');
if (!loginCode.includes('import { loginPasswordSchema')) {
  loginCode = loginCode.replace(
    /<script setup lang="ts">/,
    "<script setup lang=\"ts\">\n  import { useZodForm } from '~/composables/useZodForm'\n  import { loginPasswordSchema, loginMagicLinkSchema, loginOtpSchema } from '~/schemas/forms/auth'"
  );
  fs.writeFileSync('app/pages/login.vue', loginCode, 'utf8');
}

let regCode = fs.readFileSync('app/pages/register.vue', 'utf8');
if (!regCode.includes('import { registerSchema')) {
  regCode = regCode.replace(
    /<script setup lang="ts">/,
    "<script setup lang=\"ts\">\n  import { useZodForm } from '~/composables/useZodForm'\n  import { registerSchema } from '~/schemas/forms/auth'"
  );
  fs.writeFileSync('app/pages/register.vue', regCode, 'utf8');
}
console.log('Fixed imports properly');
