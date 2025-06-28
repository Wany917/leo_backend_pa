import { DateTime } from 'luxon'
import stripe, { SUBSCRIPTION_PLANS, COMMISSION_RATES, REDIRECT_URLS } from '#config/stripe'
import Utilisateurs from '#models/utilisateurs'
import Subscription from '#models/subscription'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'
import type Stripe from 'stripe'

// Alias pour éviter les conflits avec notre modèle Subscription
type StripeSubscription = Stripe.Subscription
type StripeInvoice = Stripe.Invoice

export default class StripeService {
  /**
   * 🎯 GESTION DES CLIENTS STRIPE
   */

  /**
   * Crée ou récupère un client Stripe
   */
  static async getOrCreateStripeCustomer(utilisateur: Utilisateurs): Promise<string> {
    // Vérifier si l'utilisateur a déjà un customer Stripe
    let customerId = utilisateur.stripeCustomerId

    if (!customerId) {
      // Créer un nouveau client Stripe
      const customer = await stripe.customers.create({
        email: utilisateur.email,
        name: `${utilisateur.first_name} ${utilisateur.last_name}`,
        metadata: {
          utilisateur_id: utilisateur.id.toString(),
        },
      })

      customerId = customer.id

      // Sauvegarder l'ID dans la base
      await utilisateur.merge({ stripeCustomerId: customerId }).save()
    }

    return customerId
  }

  /**
   * 🎯 GESTION DES ABONNEMENTS
   */

  /**
   * Crée un abonnement FREE par défaut (sans Stripe)
   */
  static async createFreeSubscription(utilisateurId: number): Promise<void> {
    // Vérifier s'il n'existe pas déjà un abonnement
    const existingSubscription = await Subscription.findBy('utilisateur_id', utilisateurId)

    if (!existingSubscription) {
      await Subscription.create({
        utilisateur_id: utilisateurId,
        subscription_type: 'free',
        monthly_price: 0,
        status: 'active',
        start_date: DateTime.now(),
        end_date: null, // FREE = illimité dans le temps
        stripeSubscriptionId: null, // Pas géré par Stripe
        stripeCustomerId: null,
        stripePriceId: null,
        stripeMetadata: null,
      })
    }
  }

  /**
   * Crée une session de checkout pour un abonnement
   */
  static async createSubscriptionCheckout(
    utilisateur: Utilisateurs,
    planType: 'starter' | 'premium'
  ): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)
    const plan = planType === 'starter' ? SUBSCRIPTION_PLANS.STARTER : SUBSCRIPTION_PLANS.PREMIUM

    if (!plan.stripePriceId) {
      throw new Error(`Plan ${planType} n'a pas de price ID Stripe configuré`)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${REDIRECT_URLS.SUCCESS}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: REDIRECT_URLS.CANCEL,
      metadata: {
        utilisateur_id: utilisateur.id.toString(),
        plan_type: planType,
      },
    })

    return session.url || ''
  }

  /**
   * Gère la finalisation d'un abonnement après paiement
   */
  static async handleSubscriptionSuccess(sessionId: string): Promise<void> {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (!session.metadata?.utilisateur_id) {
      throw new Error('Utilisateur ID manquant dans les métadonnées')
    }

    const utilisateurId = Number.parseInt(session.metadata.utilisateur_id)
    const planType = session.metadata.plan_type as 'starter' | 'premium'

    // Mettre à jour l'abonnement dans notre base
    await this.updateUserSubscription(
      utilisateurId,
      planType,
      session.subscription as StripeSubscription
    )
  }

  /**
   * Met à jour l'abonnement utilisateur
   */
  static async updateUserSubscription(
    utilisateurId: number,
    planType: 'starter' | 'premium',
    stripeSubscription: StripeSubscription
  ): Promise<void> {
    const subscriptionType = planType === 'starter' ? 'starter' : 'premium'
    const plan =
      SUBSCRIPTION_PLANS[subscriptionType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS]

    // Désactiver l'ancien abonnement
    await Subscription.query()
      .where('utilisateur_id', utilisateurId)
      .where('status', 'active')
      .update({ status: 'cancelled' })

    // Créer le nouvel abonnement avec DateTime
    // Contournement temporaire des types Stripe
    const subscription = stripeSubscription as any
    await Subscription.create({
      utilisateur_id: utilisateurId,
      subscription_type: subscriptionType,
      monthly_price: plan.price,
      status: 'active',
      start_date: DateTime.now(),
      end_date: DateTime.fromSeconds(subscription.current_period_end),
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeMetadata: subscription.metadata || null,
    })
  }

  /**
   * Crée un portail client Stripe pour gérer les abonnements
   */
  static async createCustomerPortalSession(utilisateur: Utilisateurs): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: REDIRECT_URLS.CUSTOMER_PORTAL,
    })

    return session.url
  }

  /**
   * 🎯 GESTION DES PAIEMENTS DE LIVRAISONS/SERVICES
   */

  /**
   * Crée un Payment Intent pour une livraison
   */
  static async createDeliveryPayment(
    utilisateur: Utilisateurs,
    amount: number, // en centimes
    annonceId: number,
    description: string
  ): Promise<Stripe.PaymentIntent> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)

    return await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      description,
      metadata: {
        type: 'delivery',
        utilisateur_id: utilisateur.id.toString(),
        annonce_id: annonceId.toString(),
      },
      // Capturer manuellement après validation livraison
      capture_method: 'manual',
    })
  }

  /**
   * Crée un Payment Intent pour un service
   */
  static async createServicePayment(
    utilisateur: Utilisateurs,
    amount: number, // en centimes
    serviceId: number,
    description: string
  ): Promise<Stripe.PaymentIntent> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)

    return await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      description,
      metadata: {
        type: 'service',
        utilisateur_id: utilisateur.id.toString(),
        service_id: serviceId.toString(),
      },
      capture_method: 'manual',
    })
  }

  /**
   * 🎯 LIBÉRATION DES FONDS (APRÈS VALIDATION)
   */

  /**
   * Capture le paiement et distribue les fonds
   */
  static async captureAndDistributePayment(
    paymentIntentId: string,
    livreurId?: number,
    prestataireId?: number
  ): Promise<void> {
    // Récupérer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)

    const type = paymentIntent.metadata?.type
    const amount = paymentIntent.amount_received / 100 // Convertir en euros

    let commission = 0
    let recipientId = 0

    if (type === 'delivery' && livreurId) {
      commission = (amount * COMMISSION_RATES.LIVRAISON) / 100
      recipientId = livreurId
    } else if (type === 'service' && prestataireId) {
      commission = (amount * COMMISSION_RATES.SERVICE) / 100
      recipientId = prestataireId
    }

    const recipientAmount = amount - commission

    // Créditer le portefeuille du livreur/prestataire
    await this.creditUserWallet(recipientId, recipientAmount, paymentIntentId, type || 'unknown')

    // Enregistrer la commission EcoDeli
    await this.recordEcoDeliCommission(commission, paymentIntentId, type || 'unknown')
  }

  /**
   * Crédite le portefeuille utilisateur
   */
  static async creditUserWallet(
    utilisateurId: number,
    amount: number,
    paymentIntentId: string,
    type: string
  ): Promise<void> {
    // Récupérer ou créer le portefeuille
    let portefeuille = await PortefeuilleEcodeli.findBy('utilisateurId', utilisateurId)

    if (!portefeuille) {
      portefeuille = await PortefeuilleEcodeli.create({
        utilisateurId: utilisateurId,
        soldeDisponible: 0,
        soldeEnAttente: 0,
        virementAutoActif: false,
        seuilVirementAuto: 50,
        isActive: true,
      })
    }

    // Sauvegarder le solde avant pour la transaction
    const soldeAvant = portefeuille.soldeDisponible

    // Créditer le solde
    portefeuille.soldeDisponible += amount
    await portefeuille.save()

    // Enregistrer la transaction avec metadata en string
    const transaction = await TransactionPortefeuille.create({
      portefeuilleId: portefeuille.id,
      utilisateurId: utilisateurId,
      typeTransaction: 'credit',
      montant: amount,
      soldeAvant: soldeAvant,
      soldeApres: portefeuille.soldeDisponible,
      description: `Paiement ${type} - Stripe: ${paymentIntentId}`,
      referenceExterne: paymentIntentId,
      statut: 'completed',
      metadata: null, // On va utiliser setMetadata
    })

    // Utiliser la méthode setMetadata pour l'objet JSON
    transaction.setMetadata({
      stripe_payment_intent_id: paymentIntentId,
      type,
      commission_rate: type === 'delivery' ? COMMISSION_RATES.LIVRAISON : COMMISSION_RATES.SERVICE,
    })
    await transaction.save()

    // Vérifier virement automatique si configuré
    if (
      portefeuille.virementAutoActif &&
      portefeuille.soldeDisponible >= portefeuille.seuilVirementAuto
    ) {
      console.log(
        `💳 Virement automatique déclenché: ${portefeuille.soldeDisponible}€ pour utilisateur ${utilisateurId}`
      )
      // TODO: Implémenter le virement automatique réel
    }
  }

  /**
   * Enregistre la commission EcoDeli
   */
  static async recordEcoDeliCommission(
    amount: number,
    paymentIntentId: string,
    type: string
  ): Promise<void> {
    // TODO: Créer un système de comptabilité EcoDeli
    // Pour l'instant, on peut juste logger
    console.log(`💰 Commission EcoDeli: ${amount}€ pour ${type} (${paymentIntentId})`)
  }

  /**
   * 🎯 GESTION DES WEBHOOKS STRIPE
   */

  /**
   * Traite les webhooks Stripe
   */
  static async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as StripeInvoice)
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as StripeSubscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object as StripeSubscription)
          break

        default:
          console.log(`🔔 Webhook non géré: ${event.type}`)
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Erreur webhook Stripe:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Gère la complétion d'un checkout
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode === 'subscription' && session.subscription) {
      await this.handleSubscriptionSuccess(session.id)
    }
  }

  /**
   * Gère le paiement réussi d'une facture
   */
  private static async handleInvoicePaymentSucceeded(invoice: StripeInvoice): Promise<void> {
    // Contournement temporaire des types Stripe
    const invoiceAny = invoice as any
    if (invoiceAny.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoiceAny.subscription as string)
      console.log('Facture payée pour abonnement:', subscription.id)
    }
  }

  /**
   * Gère la mise à jour d'un abonnement
   */
  private static async handleSubscriptionUpdated(subscription: StripeSubscription): Promise<void> {
    // Synchroniser avec notre base de données
    const customerId = subscription.customer as string

    // Trouver l'utilisateur via son customer ID
    const utilisateur = await Utilisateurs.findBy('stripeCustomerId', customerId)

    if (utilisateur) {
      // Contournement temporaire des types Stripe
      const subscriptionAny = subscription as any
      await Subscription.query()
        .where('utilisateur_id', utilisateur.id)
        .update({
          status: subscription.status === 'active' ? 'active' : 'cancelled',
          end_date: DateTime.fromSeconds(subscriptionAny.current_period_end),
        })
    }
  }

  /**
   * Gère l'annulation d'un abonnement
   */
  private static async handleSubscriptionCancelled(
    subscription: StripeSubscription
  ): Promise<void> {
    const customerId = subscription.customer as string

    // Trouver l'utilisateur via son customer ID
    const utilisateur = await Utilisateurs.findBy('stripeCustomerId', customerId)

    if (utilisateur) {
      await Subscription.query()
        .where('utilisateur_id', utilisateur.id)
        .update({ status: 'cancelled' })
    }
  }
}
