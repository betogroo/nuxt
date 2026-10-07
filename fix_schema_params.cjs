const fs = require('fs');

const filesToFix = [
  'app/schemas/forms/admin-unit.ts',
  'app/schemas/forms/demand-bid.ts',
  'app/schemas/forms/demand-item.ts',
  'app/schemas/forms/demand.ts',
  'app/schemas/forms/user.ts'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    // Replace required_error and invalid_type_error with message in z.enum
    code = code.replace(/z\.enum\(\[\s*([\s\S]*?)\s*\],\s*\{\s*required_error:\s*([^,]+),\s*invalid_type_error:\s*([^}]+)\}\)/g, "z.enum([$1], { message: $2 || $3 })");
    code = code.replace(/z\.enum\(\[\s*([\s\S]*?)\s*\],\s*\{\s*required_error:\s*([^}]+)\}\)/g, "z.enum([$1], { message: $2 })");
    
    // Replace required_error inside z.number
    code = code.replace(/z\.number\(\s*\{\s*required_error:\s*([^,]+),\s*invalid_type_error:\s*([^}]+)\}\s*\)/g, "z.number({ message: $2 })");
    code = code.replace(/z\.number\(\s*\{\s*required_error:\s*([^}]+)\}\s*\)/g, "z.number({ message: $1 })");

    fs.writeFileSync(file, code, 'utf8');
  }
}
console.log('Fixed schemas');
