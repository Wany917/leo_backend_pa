import { HttpContext } from '@adonisjs/core/http'
import StripeService from '#services/stripe_service'
import Utilisateurs from '#models/utilisateurs'
import {
  stripeCheckoutValidator,
  stripeDeliveryPaymentValidator,
  stripeServicePaymentValidator,
  stripeCapturePaymentValidator,
} from '#validators/stripe_validators'
import stripe from '#config/stripe'

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
   * Récupère les détails d'une session de checkout
   */
  async getCheckoutSession({ params, response }: HttpContext) {
    try {
      const { sessionId } = params

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'subscription', 'invoice'],
      })

      return response.ok({
        success: true,
        session: {
          id: session.id,
          mode: session.mode,
          status: session.status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer: session.customer,
          subscription: session.subscription,
          invoice: session.invoice,
          metadata: session.metadata,
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération session:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération de la session',
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
   * Télécharge une facture Stripe
   */
  async downloadInvoice({ params, response, auth }: HttpContext) {
    try {
      const { invoiceId } = params
      const utilisateur = auth.user as Utilisateurs

      // Vérifier que la facture appartient au client
      const invoice = await stripe.invoices.retrieve(invoiceId)

      if (!invoice.customer || invoice.customer !== utilisateur.stripeCustomerId) {
        return response.forbidden({
          success: false,
          message: 'Accès non autorisé à cette facture',
        })
      }

      // Récupérer l'URL de téléchargement
      const invoiceUrl = invoice.invoice_pdf

      if (!invoiceUrl) {
        return response.badRequest({
          success: false,
          message: 'Facture PDF non disponible',
        })
      }

      return response.ok({
        success: true,
        download_url: invoiceUrl,
      })
    } catch (error) {
      console.error('❌ Erreur téléchargement facture:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors du téléchargement de la facture',
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
   * 🚀 NOUVEAU: Crée un Payment Intent pour une livraison avec livraison_id
   */
  async createLivraisonPayment({ request, response, auth }: HttpContext) {
    try {
      const utilisateur = auth.user as Utilisateurs
      const {
        amount,
        livraison_id: livraisonId,
        description,
      } = request.only(['amount', 'livraison_id', 'description'])

      // Validation basique
      if (!amount || !livraisonId || !description) {
        return response.badRequest({
          success: false,
          message: 'Paramètres manquants: amount, livraison_id, description requis',
        })
      }

      // 🔍 VÉRIFIER QUE LA LIVRAISON EXISTE ET APPARTIENT AU CLIENT
      const LivraisonModel = await import('#models/livraison')
      const Livraison = LivraisonModel.default
      const livraison = await Livraison.query().where('id', livraisonId).preload('client').first()

      if (!livraison) {
        return response.badRequest({
          success: false,
          message: 'Livraison non trouvée',
        })
      }

      // Vérifier que la livraison appartient bien au client connecté
      // Le client.id correspond à l'utilisateur.id (relation one-to-one)
      if (livraison.clientId !== utilisateur.id) {
        return response.forbidden({
          success: false,
          message: 'Accès non autorisé à cette livraison',
        })
      }

      // Vérifier que la livraison n'est pas déjà payée
      if (livraison.paymentStatus === 'paid') {
        return response.badRequest({
          success: false,
          message: 'Cette livraison est déjà payée',
        })
      }

      // Créer le Payment Intent via le service
      const customerId = await StripeService.getOrCreateStripeCustomer(utilisateur)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Number(amount),
        currency: 'eur',
        customer: customerId,
        description: String(description),
        metadata: {
          type: 'livraison',
          utilisateur_id: utilisateur.id.toString(),
          livraison_id: livraisonId.toString(),
        },
        capture_method: 'manual', // ESCROW: L'argent est bloqué jusqu'à validation
      })

      // 🚀 MISE À JOUR DE LA LIVRAISON - STATUT AUTHORIZED (pending)
      livraison.paymentStatus = 'pending' // authorized côté frontend
      livraison.paymentIntentId = paymentIntent.id
      livraison.amount = Number(amount) / 100 // Convertir centimes en euros
      await livraison.save()

      console.log(
        `✅ Livraison ${livraisonId} mise à jour: payment_status=pending, payment_intent_id=${paymentIntent.id}`
      )

      if (livraison.livreurId) {
        try {
          console.log('💰 Ajout des fonds au portefeuille du livreur:', livraison.livreurId)
          console.log('💰 Montant à ajouter (en euros):', Number(amount) / 100)

          // Récupérer ou créer le portefeuille du livreur
          const PortefeuilleEcodeli = await import('#models/portefeuille_ecodeli')
          let portefeuille = await PortefeuilleEcodeli.default
            .query()
            .where('utilisateur_id', livraison.livreurId)
            .where('is_active', true)
            .first()

          if (!portefeuille) {
            console.log("📝 Création d'un nouveau portefeuille pour le livreur")
            portefeuille = await PortefeuilleEcodeli.default.create({
              utilisateurId: livraison.livreurId,
              soldeDisponible: 0,
              soldeEnAttente: 0,
              isActive: true,
            })
          }

          console.log('🔍 Portefeuille avant ajout:', {
            id: portefeuille.id,
            soldeDisponible: portefeuille.soldeDisponible,
            soldeEnAttente: portefeuille.soldeEnAttente,
          })

          // Ajouter les fonds en attente
          const montantEuros = Number(amount) / 100
          await portefeuille.ajouterFondsEnAttente(montantEuros)

          // Recharger le portefeuille pour voir les changements
          await portefeuille.refresh()
          console.log('✅ Portefeuille après ajout:', {
            id: portefeuille.id,
            soldeDisponible: portefeuille.soldeDisponible,
            soldeEnAttente: portefeuille.soldeEnAttente,
          })

          // Enregistrer la transaction
          const TransactionPortefeuille = await import('#models/transaction_portefeuille')
          await TransactionPortefeuille.default.create({
            portefeuilleId: portefeuille.id,
            utilisateurId: livraison.livreurId,
            typeTransaction: 'credit',
            montant: montantEuros,
            soldeAvant: Number.parseFloat(String(portefeuille.soldeDisponible)) || 0,
            soldeApres: Number.parseFloat(String(portefeuille.soldeDisponible)) || 0, // Reste le même car en attente
            description: `Paiement en escrow - Livraison #${livraisonId}`,
            referenceExterne: paymentIntent.id,
            statut: 'pending',
            metadata: JSON.stringify({
              livraisonId,
              type: 'escrow_payment',
              stripePaymentIntentId: paymentIntent.id,
            }),
          })

          console.log('✅ Fonds ajoutés au portefeuille en attente du livreur')
        } catch (walletError) {
          console.error('⚠️ Erreur ajout fonds portefeuille (non bloquant):', walletError)
          // Ne pas bloquer le paiement pour cette erreur
        }
      } else {
        console.warn('⚠️ Pas de livreur assigné pour cette livraison')
      }

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
