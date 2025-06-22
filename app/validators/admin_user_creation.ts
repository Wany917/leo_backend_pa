import vine from '@vinejs/vine'

export const adminUserCreationValidator = vine.compile(
  vine.object({
    first_name: vine.string().trim().minLength(2).maxLength(50),
    last_name: vine.string().trim().minLength(2).maxLength(50),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(100),
    phone_number: vine.string().optional().nullable(),
    address: vine.string().optional().nullable(),
    city: vine.string().trim().minLength(2).maxLength(100),
    postalCode: vine.string().trim().minLength(2).maxLength(20),
    country: vine.string().trim().minLength(2).maxLength(100),
    roles: vine.array(vine.enum(['livreur', 'commercant', 'prestataire', 'administrateur'])).optional().nullable(),
    privileges: vine.enum(['basic', 'advanced', 'super']).optional().nullable()
  })
)