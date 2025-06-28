import vine from '@vinejs/vine'

// Validator pour création de checkout abonnement
export const stripeCheckoutValidator = vine.compile(
  vine.object({
    planType: vine.enum(['starter', 'premium']),
  })
)

// Validator pour succès de checkout (query string)
export const stripeCheckoutSuccessValidator = vine.compile(
  vine.object({
    session_id: vine.string().minLength(1),
  })
)

// Validator pour création de paiement livraison
export const stripeDeliveryPaymentValidator = vine.compile(
  vine.object({
    amount: vine.number().positive().min(100), // Minimum 1€ (100 centimes)
    annonce_id: vine.number().positive(),
    description: vine.string().minLength(3).maxLength(255),
  })
)

// Validator pour création de paiement service
export const stripeServicePaymentValidator = vine.compile(
  vine.object({
    amount: vine.number().positive().min(100), // Minimum 1€ (100 centimes)
    service_id: vine.number().positive(),
    description: vine.string().minLength(3).maxLength(255),
  })
)

// Validator pour capture de paiement
export const stripeCapturePaymentValidator = vine.compile(
  vine.object({
    payment_intent_id: vine.string().minLength(1),
    livreur_id: vine.number().positive().optional(),
    prestataire_id: vine.number().positive().optional(),
  })
)

// Validator pour webhook Stripe (raw body + signature)
export const stripeWebhookValidator = vine.compile(
  vine.object({
    stripe_signature: vine.string().minLength(1),
  })
)
