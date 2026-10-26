import { z } from 'zod'

export const DEFAULT_BEC_CATALOG_URL =
  'https://www.bec.sp.gov.br/BEC_Catalogo_ui/CatalogDetalheNovo.aspx?chave=&cod_id='

export const becCatalogUrlFormSchema = z.object({
  bec_catalog_url: z
    .string()
    .trim()
    .min(1, 'A URL base do catálogo BEC é obrigatória.')
    .url('Informe uma URL válida iniciada por http:// ou https://'),
})

export type BecCatalogUrlFormInput = z.input<typeof becCatalogUrlFormSchema>
export type BecCatalogUrlFormValues = z.output<typeof becCatalogUrlFormSchema>
