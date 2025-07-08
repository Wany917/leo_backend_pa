import vine from '@vinejs/vine'

export const createTranslationValidator = vine.compile(
  vine.object({
    locale: vine.string().minLength(2).maxLength(5),
    namespace: vine.string().minLength(1).maxLength(50),
    key: vine.string().minLength(1).maxLength(255),
    value: vine.string(),
    metadata: vine.object({}).optional(),
  })
)
