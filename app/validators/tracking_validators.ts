import vine from '@vinejs/vine'

// Validator pour mise à jour position livreur
export const updatePositionValidator = vine.compile(
  vine.object({
    latitude: vine.number().min(-90).max(90),
    longitude: vine.number().min(-180).max(180),
    accuracy: vine.number().positive().optional(),
    speed: vine.number().min(0).optional(),
    heading: vine.number().min(0).max(360).optional(),
    livraison_id: vine.number().positive().optional(),
  })
)

// Validator pour recherche de livreurs par zone
export const searchDeliveryZoneValidator = vine.compile(
  vine.object({
    lat: vine.number().min(-90).max(90),
    lng: vine.number().min(-180).max(180),
    radius: vine.number().positive().max(50), // Rayon max 50km
    service_type: vine.enum(['delivery', 'service']).optional(),
  })
)
