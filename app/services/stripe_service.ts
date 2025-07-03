import stripe, { SUBSCRIPTION_PLANS, REDIRECT_URLS } from '#config/stripe'
import Utilisateurs from '#models/utilisateurs'
import Subscription from '#models/subscription'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'
import { DateTime } from 'luxon'
import Stripe from 'stripe'

export default class StripeService {
  /**
   * 🎯 GESTION DES CLIENTS STRIPE
   */

  /**
   * Récupère ou crée un client Stripe pour un utilisateur
   */
  static async getOrCreateStripeCustomer(utilisateur: Utilisateurs): Promise<string> {
    // Si l'utilisateur a déjà un ID client Stripe
    if (utilisateur.stripeCustomerId) {
      try {
        // Vérifier que le client existe toujours chez Stripe
        await stripe.customers.retrieve(utilisateur.stripeCustomerId)
        return utilisateur.stripeCustomerId
      } catch (error) {
        console.warn("Client Stripe introuvable, création d'un nouveau client")
      }
    }

    // Créer un nouveau client Stripe
    const customer = await stripe.customers.create({
      email: utilisateur.email,
      name: `${utilisateur.first_name} ${utilisateur.last_name}`,
      metadata: {
        utilisateur_id: utilisateur.id.toString(),
      },
    })

    // Sauvegarder l'ID client
    utilisateur.stripeCustomerId = customer.id
    await utilisateur.save()

    return customer.id
  }

  /**
   * 🎯 GESTION DES ABONNEMENTS
   */

  /**
   * Crée une session de checkout pour un abonnement
   */
  static async createSubscriptionCheckout(
    utilisateur: Utilisateurs,
    planType: 'starter' | 'premium'
  ): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)
    const plan = SUBSCRIPTION_PLANS[planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS]

    if (!plan || !plan.stripePriceId) {
      throw new Error(`Plan invalide ou non configuré: ${planType}`)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
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
   * Gère le succès d'un checkout d'abonnement
   */
  static async handleSubscriptionSuccess(sessionId: string): Promise<void> {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    if (!session.subscription || !session.metadata?.utilisateur_id) {
      throw new Error('Session invalide ou métadonnées manquantes')
    }

    const utilisateurId = Number.parseInt(session.metadata.utilisateur_id)
    const planType = session.metadata.plan_type as 'starter' | 'premium'
    const subscription = session.subscription as Stripe.Subscription

    // Désactiver l'ancienne souscription si elle existe
    await Subscription.query()
      .where('utilisateur_id', utilisateurId)
      .where('status', 'active')
      .update({ status: 'cancelled' })

    // Créer la nouvelle souscription
    const plan = SUBSCRIPTION_PLANS[planType.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS]
    await Subscription.create({
      utilisateur_id: utilisateurId,
      subscription_type: planType,
      monthly_price: plan.price,
      start_date: DateTime.now(),
      end_date: null, // Gérée par Stripe
      status: 'active',
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: session.customer as string,
      stripePriceId: plan.stripePriceId,
      stripeMetadata: {
        subscriptionItems: subscription.items.data,
        currentPeriodEnd: (subscription as any).current_period_end,
      } as any,
    })
  }

  /**
   * Crée un abonnement gratuit par défaut
   */
  static async createFreeSubscription(utilisateurId: number): Promise<Subscription> {
    return await Subscription.create({
      utilisateur_id: utilisateurId,
      subscription_type: 'free',
      monthly_price: 0,
      start_date: DateTime.now(),
      end_date: null,
      status: 'active',
    })
  }

  /**
   * Crée une session de portail client
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
   * 🎯 GESTION DES PAIEMENTS
   */

  /**
   * Crée un Payment Intent pour une livraison
   */
  static async createDeliveryPayment(
    utilisateur: Utilisateurs,
    amount: number,
    annonceId: number,
    description: string
  ): Promise<Stripe.PaymentIntent> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      description,
      metadata: {
        type: 'delivery',
        utilisateur_id: utilisateur.id.toString(),
        annonce_id: annonceId.toString(),
      },
      capture_method: 'manual', // Capture manuelle après validation livraison
    })

    return paymentIntent
  }

  /**
   * Crée un Payment Intent pour un service
   */
  static async createServicePayment(
    utilisateur: Utilisateurs,
    amount: number,
    serviceId: number,
    description: string
  ): Promise<Stripe.PaymentIntent> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      description,
      metadata: {
        type: 'service',
        utilisateur_id: utilisateur.id.toString(),
        service_id: serviceId.toString(),
      },
      capture_method: 'manual', // Capture manuelle après validation service
    })

    return paymentIntent
  }

  /**
   * Capture et distribue un paiement
   */
  static async captureAndDistributePayment(
    paymentIntentId: string,
    livreurId?: number,
    prestataireId?: number
  ): Promise<void> {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Échec de la capture du paiement')
    }

    const amount = paymentIntent.amount / 100 // Convertir en euros
    const metadata = paymentIntent.metadata
    let commission = 0
    let beneficiaireId: number | null = null

    // Déterminer la commission et le bénéficiaire
    if (metadata.type === 'delivery' && livreurId) {
      commission = amount * 0.05 // 5% pour les livraisons
      beneficiaireId = livreurId
    } else if (metadata.type === 'service' && prestataireId) {
      commission = amount * 0.08 // 8% pour les services
      beneficiaireId = prestataireId
    }

    if (!beneficiaireId) {
      throw new Error('Bénéficiaire non spécifié')
    }

    // Récupérer ou créer le portefeuille du bénéficiaire
    let portefeuille = await PortefeuilleEcodeli.query()
      .where('utilisateur_id', beneficiaireId)
      .where('is_active', true)
      .first()

    if (!portefeuille) {
      portefeuille = await PortefeuilleEcodeli.create({
        utilisateurId: beneficiaireId,
        soldeDisponible: 0,
        soldeEnAttente: 0,
        isActive: true,
      })
    }

    // Ajouter les fonds en attente (seront libérés après validation)
    const montantNet = amount - commission
    await portefeuille.ajouterFondsEnAttente(montantNet)

    // Enregistrer la transaction
    await TransactionPortefeuille.create({
      portefeuilleId: portefeuille.id,
      utilisateurId: beneficiaireId,
      typeTransaction: 'credit',
      montant: montantNet,
      soldeAvant: portefeuille.soldeDisponible,
      soldeApres: portefeuille.soldeDisponible, // Pas encore disponible
      description: `Paiement ${metadata.type} #${metadata.annonce_id || metadata.service_id}`,
      referenceExterne: paymentIntentId,
      statut: 'pending',
      metadata: JSON.stringify({
        commission,
        montantBrut: amount,
        stripePaymentIntentId: paymentIntentId,
      }),
    })
  }

  /**
   * 🔒 NOUVEAU: Capture et distribue un paiement après validation de livraison
   * Méthode spécifique pour le système anti-arnaque avec code de validation
   */
  static async capturePaymentAfterDeliveryValidation(
    paymentIntentId: string,
    livraisonId: number
  ): Promise<void> {
    try {
      // Récupérer le Payment Intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status !== 'requires_capture') {
        throw new Error(`Payment Intent ${paymentIntentId} n'est pas en attente de capture`)
      }

      // Capturer le paiement
      const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId)

      if (capturedPayment.status !== 'succeeded') {
        throw new Error('Échec de la capture du paiement')
      }

      console.log(`✅ Paiement capturé avec succès: ${capturedPayment.id}`)

      // Récupérer la livraison et le livreur
      const livraisonModule = await import('#models/livraison')
      const Livraison = livraisonModule.default
      const livraison = await Livraison.query()
        .where('id', livraisonId)
        .preload('livreur')
        .firstOrFail()

      if (!livraison.livreur?.id) {
        throw new Error('Livreur non trouvé pour la livraison')
      }

      // Le reste de la logique est gérée par CodeTemporaireController.libererFondsLivraison
      // qui sera appelé après la validation du code

      console.log(`💰 Paiement prêt pour distribution au livreur ${livraison.livreur.id}`)
    } catch (error) {
      console.error('❌ Erreur capture paiement après validation:', error)
      throw error
    }
  }

  /**
   * 🔍 Vérifie si un paiement est en attente de validation (escrow)
   */
  static async checkPaymentEscrowStatus(paymentIntentId: string): Promise<{
    isInEscrow: boolean
    amount: number
    status: string
    metadata: any
  }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      return {
        isInEscrow: paymentIntent.status === 'requires_capture',
        amount: paymentIntent.amount / 100, // Convertir en euros
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
      }
    } catch (error) {
      console.error('❌ Erreur vérification escrow:', error)
      throw error
    }
  }

  /**
   * 🎯 GESTION DES WEBHOOKS
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
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )

      console.log(`📨 Webhook reçu: ${event.type}`)

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object as Stripe.Subscription)
          break

        case 'payment_intent.succeeded':
          // Géré par captureAndDistributePayment
          break

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        default:
          console.log(`⚠️ Webhook non géré: ${event.type}`)
      }

      return { success: true }
    } catch (error: any) {
      console.error('❌ Erreur webhook:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Met à jour une souscription suite à un webhook
   */
  private static async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
    const subscription = await Subscription.query()
      .where('stripe_subscription_id', stripeSubscription.id)
      .first()

    if (!subscription) {
      console.warn(`Souscription introuvable: ${stripeSubscription.id}`)
      return
    }

    // Mettre à jour le statut
    if (stripeSubscription.status === 'active') {
      subscription.status = 'active'
    } else if (['canceled', 'unpaid'].includes(stripeSubscription.status)) {
      subscription.status = 'cancelled'
    }

    subscription.stripeMetadata = {
      ...(subscription.stripeMetadata as any),
      status: stripeSubscription.status,
      currentPeriodEnd: (stripeSubscription as any).current_period_end,
    }

    await subscription.save()
  }

  /**
   * Gère l'annulation d'une souscription
   */
  private static async handleSubscriptionCancellation(stripeSubscription: Stripe.Subscription) {
    const subscription = await Subscription.query()
      .where('stripe_subscription_id', stripeSubscription.id)
      .first()

    if (!subscription) {
      return
    }

    subscription.status = 'cancelled'
    subscription.end_date = DateTime.fromSeconds((stripeSubscription as any).current_period_end)
    await subscription.save()

    // Créer automatiquement un abonnement Free
    await this.createFreeSubscription(subscription.utilisateur_id)
  }

  /**
   * Gère le paiement réussi d'une facture
   */
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log(`💰 Facture payée: ${invoice.id} - ${invoice.amount_paid / 100}€`)
    // Ici on pourrait enregistrer le paiement dans la table payments
  }
}
