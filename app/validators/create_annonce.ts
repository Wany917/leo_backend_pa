import vine from '@vinejs/vine'

export const annonceValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number(),
    title: vine.string().minLength(3).maxLength(50),
    description: vine.string().minLength(10).maxLength(500).optional(),
    price: vine.number(),
    tags: vine.array(vine.string()).optional(),
    type: vine.enum(['transport_colis', 'service_personne']).optional(),
    status: vine.enum(['active', 'pending', 'completed', 'cancelled']).optional(),
    desired_date: vine.string().optional(),
    actual_delivery_date: vine.string().optional(),
    end_location: vine.string().optional(),
    start_location: vine.string().optional(),
    priority: vine.boolean().optional(),
    storage_box_id: vine.string().optional(),
    image_path: vine.string().optional(),
    insurance_amount: vine.number().optional(),
  })
)
