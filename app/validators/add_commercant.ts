import vine from '@vinejs/vine'

export const commercantValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number(),
    store_name: vine.string().maxLength(50),
    business_address: vine.string().maxLength(100).optional(),
  })
)
