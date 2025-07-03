import vine from '@vinejs/vine'

export const createBookingValidator = vine.compile(
  vine.object({
    client_id: vine.number().positive(),
    service_id: vine.number().positive(),
    booking_date: vine.date(),
    notes: vine.string().optional(),
    total_price: vine.number().positive().optional(),
    duration: vine.number().positive().optional(),
  })
)
