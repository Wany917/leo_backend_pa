import vine from '@vinejs/vine'

export const prestataireValidator = vine.compile(
    vine.object({
        user_id: vine.number(),
        service_type: vine.string().minLength(3).maxLength(50).optional(),
    })
)