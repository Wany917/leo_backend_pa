import vine from '@vinejs/vine'

export const annonceValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number().positive(),
    title: vine.string().minLength(3).maxLength(100),
    description: vine.string().minLength(10).maxLength(500).optional(),
    price: vine.number().positive(),
    type: vine.enum(['transport_colis', 'service_personne']),
    status: vine.enum(['active', 'pending', 'completed', 'cancelled']).optional(),
    desired_date: vine.string().optional(),
    end_location: vine.string().optional(),
    start_location: vine.string().optional(),
    priority: vine.boolean().optional(),
    tags: vine.array(vine.string()).optional(),
  })
)
