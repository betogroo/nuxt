import type { z } from 'zod'
import type { TypedSchema, TypedSchemaError } from 'vee-validate'

/**
 * Adaptador Zod 4 -> vee-validate 4.
 *
 * O pacote oficial `@vee-validate/zod` só suporta Zod 3 e o vee-validate 4.x não
 * implementa o Standard Schema (isso só chega no vee-validate 5). Este adaptador
 * mínimo implementa o contrato `TypedSchema` do vee-validate usando Zod 4.
 */
export const toTypedSchema = <S extends z.ZodType>(
  schema: S,
): TypedSchema<z.input<S>, z.output<S>> => {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)

      if (result.success) {
        return { value: result.data, errors: [] }
      }

      const errorsByPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.')
        const messages = errorsByPath.get(path) ?? []
        messages.push(issue.message)
        errorsByPath.set(path, messages)
      }

      const errors: TypedSchemaError[] = Array.from(errorsByPath, ([path, messages]) => ({
        path,
        errors: messages,
      }))

      return { errors }
    },
  }
}
