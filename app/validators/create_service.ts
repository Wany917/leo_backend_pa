import vine from '@vinejs/vine'

export const serviceValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(100),
    description: vine.string().minLength(10).maxLength(1000),
    price: vine.number().min(0), // Permettre 0 pour les tarifs horaires
    pricing_type: vine.enum(['fixed', 'hourly', 'custom']).optional(),
    hourly_rate: vine.number().positive().nullable().optional(),
    location: vine.string().minLength(3).maxLength(255),
    duration: vine.number().positive().nullable().optional(),
    status: vine
      .enum([
        'available',
        'unavailable',
        'suspended',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'pending',
        'validated',
        'refused',
      ])
      .optional(),
    availability_description: vine.string().maxLength(500).nullable().optional(),
    home_service: vine.boolean().optional(),
    requires_materials: vine.boolean().optional(),
    prestataireId: vine.number().positive().optional(),
    service_type_id: vine.number().positive(),
  })
)
