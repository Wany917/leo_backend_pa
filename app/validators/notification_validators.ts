import vine from '@vinejs/vine'

export const pushNotificationValidator = vine.compile(
  vine.object({
    user_id: vine.number().positive().optional(), // null = broadcast
    title: vine.string().minLength(1).maxLength(100),
    body: vine.string().minLength(1).maxLength(500),
    type: vine.enum([
      'delivery_update',
      'new_message',
      'payment_received',
      'service_booked',
      'service_reminder',
      'promotion',
      'system',
    ]),
    priority: vine.enum(['low', 'normal', 'high', 'urgent']).optional(),
    data: vine.object({}).optional(),
    scheduled_for: vine.string().optional(),
  })
)

// Validator pour mise à jour Player ID OneSignal
export const oneSignalPlayerValidator = vine.compile(
  vine.object({
    player_id: vine.string().minLength(1),
    push_notifications_enabled: vine.boolean().optional(),
    notification_preferences: vine.object({}).optional(),
  })
)
