import vine from '@vinejs/vine'

export const adminValidator = vine.compile(
  vine.object({
    id: vine.number().positive(),
  })
)

export const validatePrestataireValidator = vine.compile(
  vine.object({
    validation_status: vine.enum(['approved', 'rejected', 'pending']),
    admin_comments: vine.string().maxLength(500).optional(),
  })
)
