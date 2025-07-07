import vine from '@vinejs/vine'

export const validateDeliveryValidator = vine.compile(
  vine.object({
    tracking_number: vine.string().trim(),
    code: vine.string().fixedLength(6),
  })
)
