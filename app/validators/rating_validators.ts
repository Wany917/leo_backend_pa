import vine from '@vinejs/vine'

export const createRatingValidator = vine.compile(
  vine.object({
    reviewed_id: vine.number().positive(), // ID de l'utilisateur évalué
    rating_type: vine.enum(['delivery', 'service', 'product']),
    rating_for_id: vine.number().positive(), // ID de la livraison/service/produit
    overall_rating: vine.number().min(1).max(5),
    comment: vine.string().maxLength(1000).optional(),
  })
)

// Validator pour réponse admin à une évaluation
export const adminRatingResponseValidator = vine.compile(
  vine.object({
    admin_response: vine.string().minLength(1).maxLength(500),
  })
)
