import { z } from 'zod'

export const DEFAULT_BEC_CATALOG_URL =
  'https://www.bec.sp.gov.br/BEC_Catalogo_ui/CatalogDetalheNovo.aspx?chave=&cod_id='

export const DEFAULT_CLASS_CEILING_2026 = 65492.11

export const DEFAULT_PRODUCT_CLASS_ANNUAL_CEILINGS: Record<string, number> = {
  '2026': DEFAULT_CLASS_CEILING_2026,
}

export const becCatalogUrlFormSchema = z.object({
  bec_catalog_url: z
    .string()
    .trim()
    .min(1, 'A URL base do catálogo BEC é obrigatória.')
    .url('Informe uma URL válida iniciada por http:// ou https://'),
})

export const annualClassCeilingFormSchema = z.object({
  year: z.coerce
    .number({ message: 'Informe um ano válido.' })
    .int('O ano deve ser um número inteiro.')
    .min(1990, 'O ano deve ser maior ou igual a 1990.')
    .max(2100, 'O ano deve ser menor ou igual a 2100.'),
  ceiling_amount: z.coerce
    .number({ message: 'Informe um valor numérico válido.' })
    .positive('O valor do teto por classe deve ser maior que zero.'),
})

export type BecCatalogUrlFormInput = z.input<typeof becCatalogUrlFormSchema>
export type BecCatalogUrlFormValues = z.output<typeof becCatalogUrlFormSchema>
export type AnnualClassCeilingFormInput = z.input<typeof annualClassCeilingFormSchema>
export type AnnualClassCeilingFormValues = z.output<typeof annualClassCeilingFormSchema>
