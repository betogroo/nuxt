const fs = require('fs');

// 1. Fix app/composables/useDemandProducts.ts
let useDemandProductsFile = 'app/composables/useDemandProducts.ts';
let useDemandProductsContent = fs.readFileSync(useDemandProductsFile, 'utf8');
useDemandProductsContent = useDemandProductsContent.replace(/let finalUnitId = ''/g, 'let finalUnitId: string');
fs.writeFileSync(useDemandProductsFile, useDemandProductsContent, 'utf8');

// 2. Fix app/composables/useProducts.ts
let useProductsFile = 'app/composables/useProducts.ts';
let useProductsContent = fs.readFileSync(useProductsFile, 'utf8');
useProductsContent = useProductsContent.replace(/let unitId = ''/g, 'let unitId: string');
fs.writeFileSync(useProductsFile, useProductsContent, 'utf8');

// 3. Fix app/pages/profile.vue
let profileFile = 'app/pages/profile.vue';
let profileContent = fs.readFileSync(profileFile, 'utf8');
profileContent = profileContent.replace(/const { profile, updateProfile, fetchProfile } = useProfile\(\)/g, 'const { profile, updateProfile } = useProfile()');
fs.writeFileSync(profileFile, profileContent, 'utf8');
