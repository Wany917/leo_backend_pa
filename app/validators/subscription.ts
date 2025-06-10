import vine from '@vinejs/vine'

export const createSubscriptionValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number().positive(),
    subscription_type: vine.enum(['free', 'starter', 'premium']),
  })
)

export const updateSubscriptionValidator = vine.compile(
  vine.object({
    subscription_type: vine.enum(['free', 'starter', 'premium']).optional(),
    status: vine.enum(['active', 'expired', 'cancelled']).optional(),
  })
)