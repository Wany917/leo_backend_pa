import vine from '@vinejs/vine'

export const updateAnnonceValidator = vine.compile(
    vine.object({
        title: vine.string().minLength(3).maxLength(50).optional(),
        description: vine.string().minLength(10).maxLength(500).optional()
    })
)