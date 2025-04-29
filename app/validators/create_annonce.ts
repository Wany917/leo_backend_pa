import vine from '@vinejs/vine'

export const annonceValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number(),
    title: vine.string().minLength(3).maxLength(50),
    description: vine.string().minLength(10).maxLength(500).optional(),
    tags: vine.array(vine.string()).optional(),
  })
)
