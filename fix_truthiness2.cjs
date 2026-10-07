const fs = require('fs');

let file = 'app/schemas/forms/demand.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/'[^']+' \|\| '[^']+'/, "'O Tipo de Demanda é obrigatório.'");
fs.writeFileSync(file, code, 'utf8');

file = 'app/schemas/forms/user.ts';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/'[^']+' \|\| '[^']+'/, "'O Perfil é obrigatório.'");
fs.writeFileSync(file, code, 'utf8');
console.log('Fixed truthiness correctly');
