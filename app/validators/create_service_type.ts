import vine from '@vinejs/vine'

export const createServiceTypeValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(100),
    description: vine.string().optional(),
    is_active: vine.boolean().optional(),
  })
)
