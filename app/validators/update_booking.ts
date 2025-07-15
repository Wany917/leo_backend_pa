import vine from '@vinejs/vine'

/**
 * Validateur pour la mise à jour d'un booking
 * Champs modifiables selon les règles métier :
 * - start_datetime : Peut être modifié si le booking n'est pas encore confirmé ou si c'est au moins 24h avant
 * - end_datetime : Peut être modifié si le booking n'est pas encore confirmé ou si c'est au moins 24h avant
 * - notes : Toujours modifiable (informations complémentaires)
 * - total_price : Modifiable par le prestataire (ajustements de prix)
 */
export const updateBookingValidator = vine.compile(
  vine.object({
    start_datetime: vine.date().after('today').optional(),
    end_datetime: vine.date().after('today').optional(),
    notes: vine.string().maxLength(1000).optional(),
    total_price: vine.number().positive().optional(),
  })
)

/**
 * Validateur spécifique pour la modification des dates
 * Utilisé quand on veut uniquement changer les dates de rendez-vous
 */
export const updateBookingDateValidator = vine.compile(
  vine.object({
    start_datetime: vine.date().after('today'),
    end_datetime: vine.date().after('today'),
  })
)

/**
 * Validateur pour les notes du booking
 * Permet au client et au prestataire d'ajouter des informations
 */
export const updateBookingNotesValidator = vine.compile(
  vine.object({
    notes: vine.string().maxLength(1000),
  })
)
