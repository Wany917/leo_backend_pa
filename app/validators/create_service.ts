import vine from '@vinejs/vine'

export const serviceValidator = vine.compile(
    vine.object({
        name: vine.string(),
		description: vine.string(),
		price: vine.number(),
		start_date: vine.string(),
		end_date: vine.string(),
		location: vine.string(),
		status: vine.enum(['scheduled','in_progress','completed','cancelled']),
		prestataireId: vine.number().optional(),
		clientId: vine.number().optional(),
		service_type_id: vine.number(),
    })
)