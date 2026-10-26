import type { z } from 'zod'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '~/utils/toTypedSchema'

/**
 * Wrapper do `useForm` do vee-validate para schemas Zod.
 * Os valores, o output validado e os erros são tipados a partir do schema.
 */
export const useZodForm = <S extends z.ZodType>(schema: S, initialValues: Partial<z.input<S>>) => {
  return useForm<z.input<S> & Record<string, unknown>, z.output<S>>({
    validationSchema: toTypedSchema(schema),
    initialValues: initialValues as z.input<S> & Record<string, unknown>,
  })
}
