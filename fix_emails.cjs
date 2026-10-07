const fs = require('fs');

const filesToFix = [
  'app/schemas/forms/auth.ts',
  'app/schemas/forms/demand-bid.ts',
  'app/schemas/forms/supplier.ts',
  'app/schemas/forms/user.ts'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Convert z.string().trim().min(1, '...').email('...') to z.email('...').trim().min(1, '...')
    // Convert z.string().trim().email('...').min(1, '...') to z.email('...').trim().min(1, '...')
    // Convert z.string().email('...') to z.email('...')
    
    code = code.replace(/z\.string\(\)\.trim\(\)\.min\([^)]+\)\.email\(([^)]+)\)/g, "z.email($1).trim().min(1, 'O e-mail é obrigatório.')");
    code = code.replace(/z\.string\(\)\.trim\(\)\.email\(([^)]+)\)\.min\([^)]+\)/g, "z.email($1).trim().min(1, 'O e-mail é obrigatório.')");
    code = code.replace(/z\.string\(\)\.trim\(\)\.email\(([^)]+)\)/g, "z.email($1).trim()");
    code = code.replace(/z\.string\(\)\.email\(([^)]+)\)/g, "z.email($1)");

    fs.writeFileSync(file, code, 'utf8');
  }
}
console.log('Fixed emails');
