const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

const handleAddRegex = /const handleAddResponsible = respSubmit\([\s\S]*?\}\)/;
const handleAddMatch = code.match(handleAddRegex)[0];

code = code.replace(handleAddMatch, '');

// insert it after respSubmit is defined
const respSubmitRegex = /const \[responsibleUserId, respUserIdProps\] = respDefine\('user_id'\)/;
code = code.replace(respSubmitRegex, `const [responsibleUserId, respUserIdProps] = respDefine('user_id')\n\n  ${handleAddMatch}`);

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed initialization order');
