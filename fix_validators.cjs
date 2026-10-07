const fs = require('fs');

let formatters = fs.readFileSync('app/utils/formatters.ts', 'utf8');
if (!formatters.includes('export function isValidCnpj')) {
  formatters += `
export function isValidCnpj(cnpj: string): boolean {
  if (!cnpj) return false;
  cnpj = cnpj.replace(/[^\\d]+/g, '');
  if (cnpj.length !== 14) return false;
  
  if (/^(\\d)\\1+$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}
`;
  fs.writeFileSync('app/utils/formatters.ts', formatters, 'utf8');
}

let validators = fs.readFileSync('app/schemas/validators.ts', 'utf8');
if (!validators.includes('export const cnpjValidator')) {
  validators = validators.replace("import { isValidCpf, isValidRgSP }", "import { isValidCpf, isValidRgSP, isValidCnpj }");
  validators += `
export const cnpjValidator = z
  .string()
  .refine((value) => !value || isValidCnpj(value), {
    message: 'O CNPJ informado é inválido.',
  })
`;
  fs.writeFileSync('app/schemas/validators.ts', validators, 'utf8');
}
console.log('Fixed formatters and validators');
