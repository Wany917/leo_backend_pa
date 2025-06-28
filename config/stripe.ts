import env from '#start/env'
import Stripe from 'stripe'

// Configuration Stripe
export const stripeConfig = {
  secretKey: env.get('STRIPE_SECRET_KEY', ''),
  publishableKey: env.get('STRIPE_PUBLISHABLE_KEY', ''),
  webhookSecret: env.get('STRIPE_WEBHOOK_SECRET', ''),
  apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion,
}

// Instance Stripe
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion,
  typescript: true,
})

export default stripe

// Configuration des prix d'abonnement EcoDeli
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: null, // Free n'a pas besoin de Stripe
    features: {
      assurance: 0,
      reduction: 0,
      prioritaire: 15, // % supplément
    },
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 9.9,
    stripePriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    features: {
      assurance: 115, // €
      reduction: 5, // %
      prioritaire: 5, // % supplément
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    features: {
      assurance: 3000, // €
      reduction: 9, // %
      prioritaire: 0, // 3 gratuits par mois
      premierEnvoiGratuit: true,
    },
  },
} as const

// Configuration des commissions EcoDeli
export const COMMISSION_RATES = {
  LIVRAISON: Number(process.env.COMMISSION_LIVRAISON) || 5, // %
  SERVICE: Number(process.env.COMMISSION_SERVICE) || 8, // %
} as const

// URLs de redirection
export const REDIRECT_URLS = {
  SUCCESS: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stripe/success`,
  CANCEL: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stripe/cancelled`,
  CUSTOMER_PORTAL: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account/billing`,
} as const
