import vine from '@vinejs/vine'

export const shopkeeperDeliveryValidator = vine.compile(
  vine.object({
    customer_name: vine.string().trim().minLength(3),
    customer_email: vine.string().email(),
    customer_phone: vine.string().trim().optional(),
    customer_address: vine.string().trim().minLength(10),
    products_summary: vine.string().trim().minLength(5),
    total_weight: vine.number().positive().optional(),
    price: vine.number().positive(),
    delivery_type: vine.enum(['normal', 'cart']).optional(),
    starting_point: vine.string().trim().optional(),
    starting_type: vine.enum(['address', 'box']).optional(),
    delivery_date: vine.string().optional(),
  })
)
