import vine from '@vinejs/vine'

export const createBookingValidator = vine.compile(
  vine.object({
    client_id: vine.number().positive(),
    service_id: vine.number().positive(),
    start_datetime: vine.date().after('today'),
    end_datetime: vine.date().after('today'),
    notes: vine.string().optional(),
    total_price: vine.number().positive().optional(),
    duration: vine.number().positive().optional(),
  })
)
