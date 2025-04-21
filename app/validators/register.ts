import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
    vine.object({
        first_name: vine.string().minLength(3).maxLength(50),
        last_name: vine.string().minLength(3).maxLength(50),
        email: vine.string().email().toLowerCase(),
        address: vine.string().nullable().optional(),
        password: vine.string().minLength(6).maxLength(20),
        confirm_password: vine.string().minLength(6).maxLength(20),
        phone_number: vine.string().nullable().optional(),
    })
)
