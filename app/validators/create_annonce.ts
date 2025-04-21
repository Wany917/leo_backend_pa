import vine from '@vinejs/vine'

export const annonceValidator = vine.compile(
    vine.object({
        user_id: vine.number(),
        title: vine.string().minLength(3).maxLength(50),
        description: vine.string().minLength(10).maxLength(500).optional(),
        tags: vine.array(vine.string().minLength(3).maxLength(20)).optional(),
        state: vine.enum(['open', 'pending', 'closed']).optional(),
    })
)