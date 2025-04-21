import vine from '@vinejs/vine'

export const livreurValidator = vine.compile(
    vine.object({
        user_id: vine.number()
    })
)