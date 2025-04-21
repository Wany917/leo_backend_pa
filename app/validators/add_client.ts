import vine from '@vinejs/vine'

export const clientValidator = vine.compile(
    vine.object({
        user_id: vine.number(),
    })
)