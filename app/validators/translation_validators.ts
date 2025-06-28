import vine from '@vinejs/vine'

// Validator pour création/mise à jour de traduction
export const translationValidator = vine.compile(
  vine.object({
    locale: vine
      .string()
      .fixedLength(2)
      .regex(/^[a-z]{2}$/), // fr, en, es, etc.
    namespace: vine.string().minLength(1).maxLength(50), // ui, email, notification
    key: vine.string().minLength(1).maxLength(100), // clé de traduction
    value: vine.string().minLength(1).maxLength(5000), // texte traduit
    metadata: vine.object({}).optional(), // contexte, variables, etc.
  })
)

// Validator pour mise à jour langue utilisateur
export const updateUserLanguageValidator = vine.compile(
  vine.object({
    preferred_language: vine
      .string()
      .fixedLength(2)
      .regex(/^[a-z]{2}$/),
  })
)

// Validator pour import bulk de traductions
export const bulkTranslationValidator = vine.compile(
  vine.object({
    locale: vine
      .string()
      .fixedLength(2)
      .regex(/^[a-z]{2}$/),
    namespace: vine.string().minLength(1).maxLength(50),
    translations: vine.object({}), // Objet clé-valeur des traductions
  })
)
