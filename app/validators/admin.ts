import vine from '@vinejs/vine'

export const adminValidator = vine.compile(
  vine.object({
    id: vine.number().positive(),
    privileges: vine.enum(['basic', 'advanced', 'super']).optional(),
  })
)

export const validatePrestataireValidator = vine.compile(
  vine.object({
    validation_status: vine.enum(['approved', 'rejected', 'pending']),
    admin_comments: vine.string().maxLength(500).optional(),
  })
)
