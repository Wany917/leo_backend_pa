import { HttpContext } from '@adonisjs/core/http'
import StripeService from '#services/stripe_service'
import Utilisateurs from '#models/utilisateurs'
import {
  stripeCheckoutValidator,
  stripeDeliveryPaymentValidator,
  stripeServicePaymentValidator,
  stripeCapturePaymentValidator,
} from '#validators/stripe_validators'

export default class StripeController {
  /**
   * 🎯 GESTION DES ABONNEMENTS
   */

  /**
   * Crée une session de checkout pour un abonnement
   */
  async createSubscriptionCheckout({ request, response, auth }: HttpContext) {
    try {
      const utilisateur = auth.user as Utilisateurs
      const { planType } = await request.validateUsing(stripeCheckoutValidator)

      const checkoutUrl = await StripeService.createSubscriptionCheckout(utilisateur, planType)

      return response.ok({
        success: true,
        checkout_url: checkoutUrl,
      })
    } catch (error) {
      console.error('❌ Erreur création checkout:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du checkout',
      })
    }
  }

  /**
   * Gère le succès d'un checkout
   */
  async handleCheckoutSuccess({ request, response }: HttpContext) {
    try {
      const { session_id: sessionId } = request.qs()

      if (!sessionId) {
        return response.badRequest({ message: 'Session ID manquant' })
      }

      await StripeService.handleSubscriptionSuccess(sessionId)

      return response.ok({
        success: true,
        message: 'Abonnement activé avec succès',
      })
    } catch (error) {
      console.error('❌ Erreur traitement succès checkout:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors du traitement',
      })
    }
  }

  /**
   * Crée un portail client pour gérer les abonnements
   */
  async createCustomerPortal({ response, auth }: HttpContext) {
    try {
      const utilisateur = auth.user as Utilisateurs
      const portalUrl = await StripeService.createCustomerPortalSession(utilisateur)

      return response.ok({
        success: true,
        portal_url: portalUrl,
      })
    } catch (error) {
      console.error('❌ Erreur création portail client:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du portail',
      })
    }
  }

  /**
   * 🎯 GESTION DES PAIEMENTS
   */

  /**
   * Crée un Payment Intent pour une livraison
   */
  async createDeliveryPayment({ request, response, auth }: HttpContext) {
    try {
      const utilisateur = auth.user as Utilisateurs
      const {
        amount,
        annonce_id: annonceId,
        description,
      } = await request.validateUsing(stripeDeliveryPaymentValidator)

      const paymentIntent = await StripeService.createDeliveryPayment(
        utilisateur,
        amount,
        annonceId,
        description
      )

      return response.ok({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })
    } catch (error) {
      console.error('❌ Erreur création paiement livraison:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du paiement',
      })
    }
  }

  /**
   * Crée un Payment Intent pour un service
   */
  async createServicePayment({ request, response, auth }: HttpContext) {
    try {
      const utilisateur = auth.user as Utilisateurs
      const {
        amount,
        service_id: serviceId,
        description,
      } = await request.validateUsing(stripeServicePaymentValidator)

      const paymentIntent = await StripeService.createServicePayment(
        utilisateur,
        amount,
        serviceId,
        description
      )

      return response.ok({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })
    } catch (error) {
      console.error('❌ Erreur création paiement service:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du paiement',
      })
    }
  }

  /**
   * Capture et distribue un paiement après validation
   */
  async capturePayment({ request, response, auth }: HttpContext) {
    try {
      const {
        payment_intent_id: paymentIntentId,
        livreur_id: livreurId,
        prestataire_id: prestataireId,
      } = await request.validateUsing(stripeCapturePaymentValidator)

      await StripeService.captureAndDistributePayment(paymentIntentId, livreurId, prestataireId)

      return response.ok({
        success: true,
        message: 'Paiement capturé et distribué avec succès',
      })
    } catch (error) {
      console.error('❌ Erreur capture paiement:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la capture du paiement',
      })
    }
  }

  /**
   * 🎯 INFORMATIONS PUBLIQUES
   */

  /**
   * Récupère les informations de commission et plans
   */
  async getCommissionInfo({ response }: HttpContext) {
    try {
      return response.ok({
        success: true,
        commissions: {
          delivery: 5, // %
          service: 8, // %
        },
        subscription_plans: {
          free: {
            name: 'Free',
            price: 0,
            features: {
              max_packages_per_month: 5,
              insurance_coverage: 0,
              priority_support: false,
            },
          },
          starter: {
            name: 'Starter',
            price: 9.9,
            features: {
              max_packages_per_month: 50,
              insurance_coverage: 115,
              priority_support: false,
              discount: 5, // %
            },
          },
          premium: {
            name: 'Premium',
            price: 19.99,
            features: {
              max_packages_per_month: -1, // Illimité
              insurance_coverage: 3000,
              priority_support: true,
              discount: 9, // %
              first_delivery_free: true,
            },
          },
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération infos commission:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des informations',
      })
    }
  }

  /**
   * 🎯 WEBHOOKS STRIPE
   */

  /**
   * Endpoint pour recevoir les webhooks Stripe
   */
  async webhook({ request, response }: HttpContext) {
    try {
      const signature = request.header('stripe-signature')
      const rawBody = request.raw()

      if (!signature || !rawBody) {
        return response.badRequest({ message: 'Signature ou body manquant' })
      }

      const result = await StripeService.handleWebhook(rawBody.toString(), signature)

      if (result.success) {
        return response.ok({ received: true })
      } else {
        console.error('❌ Erreur traitement webhook:', result.error)
        return response.badRequest({ message: result.error })
      }
    } catch (error) {
      console.error('❌ Erreur webhook:', error)
      return response.internalServerError({
        message: 'Erreur lors du traitement du webhook',
      })
    }
  }
}
