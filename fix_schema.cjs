const fs = require('fs');
let code = fs.readFileSync('app/schemas/forms/product.ts', 'utf8');

code = code.replace(
  /\.refine\(\s*\(data\) => \{\s*if \(data\.is_suggesting_class\) \{\s*return \(\s*!!data\.suggested_class_id &&\s*data\.suggested_class_id\.length > 0 &&\s*!!data\.suggested_class_name &&\s*data\.suggested_class_name\.length > 0\s*\)\s*\}\s*return true\s*\},[\s\S]*?\)/,
  `.superRefine((data, ctx) => {
    if (data.is_suggesting_class) {
      if (!data.suggested_class_id || data.suggested_class_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Código da Classe é obrigatório.',
          path: ['suggested_class_id'],
        })
      }
      if (!data.suggested_class_name || data.suggested_class_name.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Nome da Classe é obrigatório.',
          path: ['suggested_class_name'],
        })
      }
    } else {
      if (!data.product_class_id || data.product_class_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A Classe do Produto é obrigatória.',
          path: ['product_class_id'],
        })
      }
    }
  })`
);

code = code.replace(
  /\.refine\(\s*\(data\) => \{\s*if \(data\.is_suggesting_nature\) \{\s*return \(\s*!!data\.suggested_nature_id &&\s*data\.suggested_nature_id\.length > 0 &&\s*!!data\.suggested_nature_name &&\s*data\.suggested_nature_name\.length > 0\s*\)\s*\}\s*else \{\s*return !!data\.expense_nature_id && data\.expense_nature_id\.length > 0\s*\}\s*\},[\s\S]*?\)/,
  `.superRefine((data, ctx) => {
    if (data.is_suggesting_nature) {
      if (!data.suggested_nature_id || data.suggested_nature_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Código da Natureza é obrigatório.',
          path: ['suggested_nature_id'],
        })
      }
      if (!data.suggested_nature_name || data.suggested_nature_name.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Nome da Natureza é obrigatório.',
          path: ['suggested_nature_name'],
        })
      }
    } else {
      if (!data.expense_nature_id || data.expense_nature_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A Natureza de Despesa é obrigatória.',
          path: ['expense_nature_id'],
        })
      }
    }
  })`
);

fs.writeFileSync('app/schemas/forms/product.ts', code, 'utf8');
console.log('Fixed schema');
