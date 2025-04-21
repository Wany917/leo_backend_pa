import vine from '@vinejs/vine'

export const userUpdateValidator = vine.compile(
    vine.object({
        first_name: vine.string().minLength(3).maxLength(50).optional(),
        last_name: vine.string().minLength(3).maxLength(50).optional(),
        address: vine.string().nullable().optional(),
        password: vine.string().minLength(6).maxLength(20).optional(),
        phone_number: vine.string().nullable().optional(),
    })
)