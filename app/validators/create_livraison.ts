import vine from '@vinejs/vine'

export const livraisonValidator = vine.compile(
  vine.object({
    livreur_id: vine.number().min(1),
    pickup_location: vine.string().minLength(3).maxLength(100),
    dropoff_location: vine.string().minLength(3).maxLength(100),
    status: vine.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  })
)

// Nouveau validator pour les mises à jour (tous les champs optionnels)
export const updateLivraisonValidator = vine.compile(
  vine.object({
    livreur_id: vine.number().min(1).optional(),
    pickup_location: vine.string().minLength(3).maxLength(100).optional(),
    dropoff_location: vine.string().minLength(3).maxLength(100).optional(),
    status: vine.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    estimated_delivery_time: vine.string().optional(),
  })
)
