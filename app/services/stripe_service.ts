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

    if (!plan) {
      throw new Error(`Plan invalide: ${planType}`)
    }

    if (!plan.stripePriceId) {
      throw new Error(`Configuration Stripe manquante: STRIPE_PRICE_${planType.toUpperCase()}_MONTHLY doit être défini dans les variables d'environnement`)
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
   * 🆕 Crée un Payment Intent pour une recharge de cagnotte
   * Capture automatique (pas d'escrow pour les recharges)
   */
  static async createWalletRechargePayment(
    utilisateur: Utilisateurs,
    amount: number,
    description: string
  ): Promise<Stripe.PaymentIntent> {
    const customerId = await this.getOrCreateStripeCustomer(utilisateur)

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      description,
      metadata: {
        type: 'wallet_recharge',
        utilisateur_id: utilisateur.id.toString(),
        montant_euros: (amount / 100).toString(),
      },
      capture_method: 'automatic', // Capture automatique pour les recharges
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

      // Si le paiement est déjà capturé ou non capturable, on n'essaie pas de le capturer de nouveau
      if (paymentIntent.status !== 'requires_capture') {
        console.warn(
          `⚠️ Payment Intent ${paymentIntentId} déjà capturé ou non capturable (statut: ${paymentIntent.status})`
        )
        return
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

      console.log(` Paiement prêt pour distribution au livreur ${livraison.livreur.id}`)
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

        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent

          // 🔄 RECHARGE CAGNOTTE CLIENT
          if (pi.metadata?.type === 'wallet_recharge') {
            try {
              await this.handleWalletRecharge(pi)
            } catch (rechargeError) {
              console.error('❌ Erreur traitement recharge cagnotte (webhook):', rechargeError)
            }
            break
          }

          // Autres paiements directs gérés ailleurs
          break
        }

        case 'payment_intent.amount_capturable_updated':
          // Lorsque le paiement est confirmé et que les fonds sont bloqués (escrow)
          await this.markDeliveryPaymentPending(event.data.object as Stripe.PaymentIntent)
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
    console.log(` Facture payée: ${invoice.id} - ${invoice.amount_paid / 100}€`)
    // Ici on pourrait enregistrer le paiement dans la table payments
  }

  /**
   * 🔧 METTRE À JOUR LES MÉTADONNÉES D'UN PAYMENT INTENT
   */
  static async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<void> {
    try {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: metadata,
      })
      console.log(`✅ Métadonnées mises à jour pour Payment Intent ${paymentIntentId}`)
    } catch (error) {
      console.error('❌ Erreur mise à jour métadonnées:', error)
      throw error
    }
  }

  // ===============================================
  // 🆕 STRIPE CONNECT - GESTION DES COMPTES LIVREURS
  // ===============================================

  /**
   * Créer un compte Stripe Connect Express pour un livreur
   * Permet les virements automatiques SEPA vers son compte bancaire
   */
  static async createExpressAccountForDeliveryman(
    livreurId: number,
    email: string,
    country: string = 'FR'
  ): Promise<string> {
    try {
      console.log(`🏦 Création compte Stripe Connect pour livreur ${livreurId}`)

      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          ecodeli_livreur_id: livreurId.toString(),
          account_type: 'deliveryman',
        },
      })

      console.log(`✅ Compte Stripe Connect créé: ${account.id}`)
      return account.id
    } catch (error) {
      console.error('❌ Erreur création compte Connect:', error)
      throw error
    }
  }

  /**
   * Créer un lien d'onboarding pour que le livreur configure son compte
   */
  static async createAccountOnboardingLink(
    stripeAccountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      })

      console.log(`🔗 Lien d'onboarding créé pour compte ${stripeAccountId}`)
      return accountLink.url
    } catch (error) {
      console.error('❌ Erreur création lien onboarding:', error)
      throw error
    }
  }

  /**
   * Vérifier si un compte Connect est entièrement configuré
   */
  static async checkAccountStatus(stripeAccountId: string): Promise<{
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    requirements: any
  }> {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      return {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
      }
    } catch (error) {
      console.error('❌ Erreur vérification compte:', error)
      throw error
    }
  }

  /**
   *  EFFECTUER UN VIREMENT DEPUIS LE PORTEFEUILLE ECODELI
   * Transfert des fonds du portefeuille vers le compte Stripe Connect du livreur
   */
  static async transferFromWalletToDeliveryman(
    montantEuros: number,
    livreurStripeAccountId: string,
    description: string = 'Virement depuis portefeuille EcoDeli'
  ): Promise<{
    transfer_id: string
    amount: number
    status: string
  }> {
    try {
      console.log(`💸 Virement de ${montantEuros}€ vers compte ${livreurStripeAccountId}`)

      // Convertir en centimes
      const montantCentimes = Math.round(montantEuros * 100)

      // Créer le transfer vers le compte Connect
      const transfer = await stripe.transfers.create({
        amount: montantCentimes,
        currency: 'eur',
        destination: livreurStripeAccountId,
        description: description,
        metadata: {
          source: 'ecodeli_wallet',
          transfer_type: 'wallet_payout',
        },
      })

      console.log(`✅ Transfer créé: ${transfer.id} - ${montantEuros}€`)

      return {
        transfer_id: transfer.id,
        amount: montantEuros,
        status: 'created',
      }
    } catch (error) {
      console.error('❌ Erreur transfer vers livreur:', error)
      throw error
    }
  }

  /**
   * Configurer les virements automatiques pour un compte Connect
   */
  static async configureAutomaticPayouts(
    stripeAccountId: string,
    schedule: 'daily' | 'weekly' | 'monthly' = 'daily',
    delayDays: number = 2
  ): Promise<void> {
    try {
      await stripe.accounts.update(stripeAccountId, {
        settings: {
          payouts: {
            schedule: {
              interval: schedule,
              delay_days: delayDays,
            },
          },
        },
      })

      console.log(`⚙️ Virements automatiques configurés pour ${stripeAccountId}`)
    } catch (error) {
      console.error('❌ Erreur configuration virements auto:', error)
      throw error
    }
  }

  /**
   * Créer un lien vers le dashboard Express pour que le livreur gère son compte
   */
  static async createExpressDashboardLink(stripeAccountId: string): Promise<string> {
    try {
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
      return loginLink.url
    } catch (error) {
      console.error('❌ Erreur création lien dashboard:', error)
      throw error
    }
  }

  // ===============================================
  // 🆕 STRIPE CONNECT - GESTION DES COMPTES CLIENTS MULTI-RÔLES
  // ===============================================

  /**
   * Créer un compte Stripe Connect Express pour un client multi-rôles
   * Permet aux clients qui proposent des services de recevoir des paiements
   */
  static async createExpressAccountForClient(
    clientId: number,
    email: string,
    country: string = 'FR',
    isServiceProvider: boolean = false
  ): Promise<string> {
    try {
      console.log(
        `🏦 Création compte Stripe Connect pour client ${clientId} (prestataire: ${isServiceProvider})`
      )

      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          ecodeli_client_id: clientId.toString(),
          account_type: 'client',
          is_service_provider: isServiceProvider.toString(),
        },
      })

      console.log(`✅ Compte Stripe Connect créé pour client: ${account.id}`)
      return account.id
    } catch (error) {
      console.error('❌ Erreur création compte Connect client:', error)
      throw error
    }
  }

  /**
   *  EFFECTUER UN VIREMENT DEPUIS LE PORTEFEUILLE CLIENT
   * Transfert des fonds du portefeuille vers le compte Stripe Connect du client
   */
  static async transferFromWalletToClient(
    montantEuros: number,
    clientStripeAccountId: string,
    description: string = 'Virement client depuis portefeuille EcoDeli'
  ): Promise<{
    transfer_id: string
    amount: number
    status: string
  }> {
    try {
      console.log(`💸 Virement client de ${montantEuros}€ vers compte ${clientStripeAccountId}`)

      // Convertir en centimes
      const montantCentimes = Math.round(montantEuros * 100)

      // Créer le transfer vers le compte Connect
      const transfer = await stripe.transfers.create({
        amount: montantCentimes,
        currency: 'eur',
        destination: clientStripeAccountId,
        description: description,
        metadata: {
          source: 'ecodeli_wallet',
          transfer_type: 'client_wallet_payout',
        },
      })

      console.log(`✅ Transfer client créé: ${transfer.id} - ${montantEuros}€`)

      return {
        transfer_id: transfer.id,
        amount: montantEuros,
        status: 'created',
      }
    } catch (error) {
      console.error('❌ Erreur transfer vers client:', error)
      throw error
    }
  }

  /**
   * Met à jour la livraison liée au Payment Intent pour indiquer que les fonds
   * sont désormais capturables (escrow) et que le client peut valider la livraison.
   */
  private static async markDeliveryPaymentPending(paymentIntent: Stripe.PaymentIntent) {
    try {
      if (paymentIntent.metadata?.type !== 'livraison') {
        // Ne gérer que les paiements liés aux livraisons
        return
      }

      const livraisonId = Number(paymentIntent.metadata.livraison_id)
      if (!livraisonId) {
        console.warn('⚠️ payment_intent.amount_capturable_updated sans livraison_id')
        return
      }

      const livraisonModule = await import('#models/livraison')
      const Livraison = livraisonModule.default

      const livraison = await Livraison.find(livraisonId)
      if (!livraison) {
        console.warn(`⚠️ Livraison introuvable pour ID ${livraisonId}`)
        return
      }

      // Seulement si le statut n'est pas déjà paid/pending
      if (livraison.paymentStatus !== 'pending' && livraison.paymentStatus !== 'paid') {
        livraison.paymentStatus = 'pending'
        livraison.paymentIntentId = paymentIntent.id
        // Mettre à jour le montant si besoin
        livraison.amount = paymentIntent.amount / 100
        await livraison.save()
        console.log(`✅ Livraison ${livraisonId} marquée comme pending (escrow prêt)`)
      }
    } catch (error) {
      console.error('❌ Erreur markDeliveryPaymentPending:', error)
    }
  }

  private static async handleWalletRecharge(pi: Stripe.PaymentIntent) {
    try {
      const utilisateurId = Number(pi.metadata?.utilisateur_id)
      if (!utilisateurId) {
        console.warn('⚠️ handleWalletRecharge: utilisateur_id manquant dans metadata')
        return
      }

      const montantRecharge = pi.amount / 100

      // Récupérer ou créer le portefeuille
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', utilisateurId)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: utilisateurId,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      const ancienSolde = Number(portefeuille.soldeDisponible) || 0
      const nouveauSolde = ancienSolde + montantRecharge
      portefeuille.soldeDisponible = nouveauSolde
      await portefeuille.save()

      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: utilisateurId,
        typeTransaction: 'credit',
        montant: montantRecharge,
        soldeAvant: ancienSolde,
        soldeApres: portefeuille.soldeDisponible,
        description: `Recharge cagnotte via Stripe (webhook) - ${montantRecharge}€`,
        referenceExterne: pi.id,
        statut: 'completed',
        metadata: JSON.stringify({
          type: 'wallet_recharge',
          stripe_payment_intent: pi.id,
        }),
      })

      console.log(`✅ Wallet rechargé (webhook) pour user ${utilisateurId}: +${montantRecharge}€`)
    } catch (error) {
      console.error('❌ handleWalletRecharge error:', error)
      throw error
    }
  }

  /**
   * Récupère le solde disponible/pending d'un compte Connect
   */
  static async getConnectBalance(
    accountId: string
  ): Promise<{ available: number; pending: number }> {
    try {
      const balance = await stripe.balance.retrieve({ stripeAccount: accountId })

      const available =
        (balance.available || [])
          .filter((b) => b.currency === 'eur')
          .reduce((sum, b) => sum + b.amount, 0) / 100
      const pending =
        (balance.pending || [])
          .filter((b) => b.currency === 'eur')
          .reduce((sum, b) => sum + b.amount, 0) / 100

      return { available, pending }
    } catch (error) {
      console.error('❌ Erreur récupération balance Connect:', error)
      throw error
    }
  }
}
