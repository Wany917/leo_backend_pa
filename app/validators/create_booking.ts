import vine from '@vinejs/vine'

export const createBookingValidator = vine.compile(
  vine.object({
    client_id: vine.number().positive().optional(),
    service_id: vine.number().positive(),
    start_datetime: vine.string(),
    end_datetime: vine.string(),
    address: vine.string().minLength(5).maxLength(255).optional(),
    notes: vine.string().optional(),
  })
)
