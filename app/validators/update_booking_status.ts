import vine from '@vinejs/vine'

export const updateBookingStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  })
)
