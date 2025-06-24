import vine from '@vinejs/vine'

// Fonction de validation personnalisée pour les dates
function parseDateString(value: any): Date | undefined {
  if (!value) return undefined

  // Si c'est déjà une date, la retourner
  if (value instanceof Date) return value

  // Si c'est une chaîne au format YYYY-MM-DD (format standard HTML date input)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value)
    // Vérifier que la date est valide
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  // Pour d'autres formats, tenter une conversion standard
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date
  }

  return undefined
}

export const updateAnnonceValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(3).maxLength(50).optional(),
    description: vine.string().minLength(10).maxLength(500).optional(),
    price: vine.number(),
    type: vine.enum(['transport_colis', 'service_personne']).optional(),
    status: vine.enum(['active', 'pending', 'completed', 'cancelled']).optional(),
    desired_date: vine.string().optional(),
    actual_delivery_date: vine.string().optional(),
    end_location: vine.string().optional(),
    start_location: vine.string().optional(),
    priority: vine.boolean().optional(),
    storage_box_id: vine.string().optional(),
    insurance_amount: vine.number().optional(),
  })
)
