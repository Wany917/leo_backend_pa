import vine from '@vinejs/vine'

export const contractValidator = vine.compile(
    vine.object({
        planId: vine.number().positive(),
    })
)
