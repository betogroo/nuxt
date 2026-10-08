import { z } from 'zod'
import { isValidCpf, isValidRgSP, isValidCnpj } from '~/utils/formatters'

/** RG opcional no formato SP (00000000-X) com dígito verificador válido. */
export const optionalRgSp = z
  .string()
  .optional()
  .refine((value) => !value || isValidRgSP(value), {
    message: 'O RG informado é inválido ou seu dígito verificador não confere.',
  })

/** CPF opcional com dígitos verificadores válidos. */
export const optionalCpf = z
  .string()
  .optional()
  .refine((value) => !value || isValidCpf(value), {
    message: 'O CPF informado é inválido.',
  })

/** CPF obrigatório com dígitos verificadores válidos. */
export const cpfValidator = z
  .string({ required_error: 'O CPF é obrigatório.' })
  .trim()
  .min(1, 'O CPF é obrigatório.')
  .refine(isValidCpf, {
    message: 'O CPF informado é inválido.',
  })

export const cnpjValidator = z.string().refine((value) => !value || isValidCnpj(value), {
  message: 'O CNPJ informado é inválido.',
})
