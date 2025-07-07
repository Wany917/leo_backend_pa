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
      const {
        amount,
        livraison_id: livraisonId,
        description,
      } = request.only(['amount', 'livraison_id', 'description'])

      console.log('🚀 CRÉATION PAIEMENT LIVRAISON:', {
        amount,
        livraisonId,
        description,
      })

      const utilisateur = await auth.authenticate()
      if (!utilisateur) {
        return response.unauthorized({ success: false, message: 'Utilisateur non authentifié' })
      }

      // Vérifier que la livraison existe
      const LivraisonModel = await import('#models/livraison')
      const Livraison = LivraisonModel.default
      const livraison = await Livraison.find(livraisonId)
      if (!livraison) {
        return response.badRequest({
          success: false,
          message: 'Livraison introuvable',
        })
      }

      // Vérifier que l'utilisateur est le client de la livraison
      if (livraison.clientId !== utilisateur.id) {
        return response.forbidden({
          success: false,
          message: 'Vous ne pouvez pas payer pour cette livraison',
        })
      }

      // Vérifier que la livraison n'est pas déjà payée
      if (livraison.paymentStatus === 'paid') {
        return response.badRequest({
          success: false,
          message: 'Cette livraison est déjà payée',
        })
      }

      // Créer ou récupérer le client Stripe
      const customerId = await StripeService.getOrCreateStripeCustomer(utilisateur)

      // 🔒 ESCROW: Créer Payment Intent avec capture manuelle
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

      // 🚀 MISE À JOUR DE LA LIVRAISON - STATUT PENDING (authorized côté frontend)
      livraison.paymentStatus = 'pending' // authorized côté frontend
      livraison.paymentIntentId = paymentIntent.id
      livraison.amount = Number(amount) / 100 // Convertir centimes en euros
      await livraison.save()

      console.log(
        `✅ Livraison ${livraisonId} mise à jour: payment_status=pending, payment_intent_id=${paymentIntent.id}`
      )

      // 🔧 CORRECTION MAJEURE : NE PAS AJOUTER LES FONDS AU PORTEFEUILLE MAINTENANT
      // Les fonds ne seront ajoutés qu'après validation du code selon le cahier des charges
      console.log('💰 ESCROW: Fonds bloqués chez Stripe, pas encore dans le portefeuille')
      console.log('🔒 Les fonds seront libérés après validation du code de livraison')

      return response.ok({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        message:
          'Paiement créé en escrow - Les fonds seront libérés après validation de la livraison',
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
   * 🔍 DEBUG: Liste toutes les factures Stripe pour vérification
   */
  async debugListInvoices({ response, auth }: HttpContext) {
    try {
      const utilisateur = auth.user as Utilisateurs

      if (!utilisateur.stripeCustomerId) {
        return response.ok({
          success: false,
          message: 'Utilisateur sans ID client Stripe',
          invoices: [],
        })
      }

      // Récupérer toutes les factures du client
      const invoices = await stripe.invoices.list({
        customer: utilisateur.stripeCustomerId,
        limit: 10,
      })

      const formattedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        description: invoice.description,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        pdf_url: invoice.invoice_pdf,
        created: new Date(invoice.created * 1000).toISOString(),
        metadata: invoice.metadata,
      }))

      return response.ok({
        success: true,
        customer_id: utilisateur.stripeCustomerId,
        total_invoices: invoices.data.length,
        invoices: formattedInvoices,
      })
    } catch (error) {
      console.error('❌ Erreur debug factures:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des factures',
      })
    }
  }

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

  // ===============================================
  // 🆕 SYSTÈME PAIEMENT CLIENT MULTI-RÔLES
  // ===============================================

  /**
   * 💰 CRÉER PAIEMENT LIVRAISON AVEC OPTION CAGNOTTE
   * Permet aux clients de choisir entre Stripe ou leur cagnotte
   */
  async createLivraisonPaymentWithWallet({ request, response, auth }: HttpContext) {
    try {
      const {
        amount,
        livraison_id: livraisonId,
        description,
        paymentMethod, // 'stripe' | 'wallet' | 'mixed'
        walletAmount, // Montant à prendre sur la cagnotte (pour mixed)
      } = request.only(['amount', 'livraison_id', 'description', 'paymentMethod', 'walletAmount'])

      console.log('🚀 CRÉATION PAIEMENT LIVRAISON AVEC CAGNOTTE:', {
        amount,
        livraisonId,
        paymentMethod,
        walletAmount,
      })

      const utilisateur = await auth.authenticate()
      if (!utilisateur) {
        return response.unauthorized({ success: false, message: 'Utilisateur non authentifié' })
      }

      // Vérifier que la livraison existe
      const LivraisonModel = await import('#models/livraison')
      const Livraison = LivraisonModel.default
      const livraison = await Livraison.find(livraisonId)
      if (!livraison) {
        return response.badRequest({
          success: false,
          message: 'Livraison introuvable',
        })
      }

      // Vérifier que l'utilisateur est le client de la livraison
      if (livraison.clientId !== utilisateur.id) {
        return response.forbidden({
          success: false,
          message: 'Vous ne pouvez pas payer pour cette livraison',
        })
      }

      const totalAmount = Number(amount) / 100 // Convertir en euros

      // Cas 1: Paiement entièrement depuis la cagnotte
      if (paymentMethod === 'wallet') {
        const PortefeuilleEcodeli = await import('#models/portefeuille_ecodeli')
        const PortefeuilleModel = PortefeuilleEcodeli.default
        const TransactionPortefeuille = await import('#models/transaction_portefeuille')
        const TransactionModel = TransactionPortefeuille.default

        // Récupérer le portefeuille
        const portefeuille = await PortefeuilleModel.query()
          .where('utilisateur_id', utilisateur.id)
          .where('is_active', true)
          .first()

        if (!portefeuille) {
          return response.badRequest({
            success: false,
            message: 'Portefeuille non trouvé',
          })
        }

        // Vérifier le solde disponible
        if (portefeuille.soldeDisponible < totalAmount) {
          return response.badRequest({
            success: false,
            message: `Solde insuffisant. Disponible: ${portefeuille.soldeDisponible}€, Demandé: ${totalAmount}€`,
          })
        }

        // Débiter le portefeuille
        const ancienSolde = portefeuille.soldeDisponible
        await portefeuille.retirerFonds(totalAmount)

        // Enregistrer la transaction
        await TransactionModel.create({
          portefeuilleId: portefeuille.id,
          utilisateurId: utilisateur.id,
          typeTransaction: 'debit',
          montant: totalAmount,
          soldeAvant: ancienSolde,
          soldeApres: portefeuille.soldeDisponible,
          description: description || `Livraison #${livraisonId}`,
          referenceExterne: livraisonId.toString(),
          statut: 'completed',
          metadata: JSON.stringify({
            payment_method: 'wallet',
            type: 'livraison',
            reference_id: livraisonId.toString(),
          }),
        })

        // Mettre à jour la livraison
        livraison.paymentStatus = 'paid'
        livraison.amount = totalAmount
        await livraison.save()

        return response.ok({
          success: true,
          message: 'Paiement effectué depuis la cagnotte',
          paymentMethod: 'wallet',
          data: {
            montant_paye: totalAmount,
            nouveau_solde: portefeuille.soldeDisponible,
          },
        })
      }

      // Cas 2: Paiement mixte (cagnotte + Stripe)
      if (paymentMethod === 'mixed' && walletAmount) {
        const walletAmountEuros = Number(walletAmount) / 100
        const stripeAmountEuros = totalAmount - walletAmountEuros

        if (stripeAmountEuros <= 0) {
          return response.badRequest({
            success: false,
            message: 'Le montant Stripe doit être positif pour un paiement mixte',
          })
        }

        // Débiter la cagnotte d'abord (logique similaire au cas wallet)
        const PortefeuilleEcodeli = await import('#models/portefeuille_ecodeli')
        const PortefeuilleModel = PortefeuilleEcodeli.default
        const TransactionPortefeuille = await import('#models/transaction_portefeuille')
        const TransactionModel = TransactionPortefeuille.default

        const portefeuille = await PortefeuilleModel.query()
          .where('utilisateur_id', utilisateur.id)
          .where('is_active', true)
          .first()

        if (!portefeuille || portefeuille.soldeDisponible < walletAmountEuros) {
          return response.badRequest({
            success: false,
            message: 'Solde cagnotte insuffisant pour le paiement mixte',
          })
        }

        const ancienSolde = portefeuille.soldeDisponible
        await portefeuille.retirerFonds(walletAmountEuros)

        await TransactionModel.create({
          portefeuilleId: portefeuille.id,
          utilisateurId: utilisateur.id,
          typeTransaction: 'debit',
          montant: walletAmountEuros,
          soldeAvant: ancienSolde,
          soldeApres: portefeuille.soldeDisponible,
          description: `Livraison #${livraisonId} (partie cagnotte)`,
          referenceExterne: `${livraisonId}_wallet`,
          statut: 'completed',
          metadata: JSON.stringify({
            payment_method: 'mixed_wallet',
            type: 'livraison',
          }),
        })

        // Créer le Payment Intent Stripe pour le reste
        const customerId = await StripeService.getOrCreateStripeCustomer(utilisateur)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(stripeAmountEuros * 100), // Convertir en centimes
          currency: 'eur',
          customer: customerId,
          description: `${description} (partie Stripe)`,
          metadata: {
            type: 'livraison_mixed',
            utilisateur_id: utilisateur.id.toString(),
            livraison_id: livraisonId.toString(),
            wallet_amount: walletAmountEuros.toString(),
            total_amount: totalAmount.toString(),
          },
          capture_method: 'manual',
        })

        return response.ok({
          success: true,
          paymentMethod: 'mixed',
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          wallet_amount: walletAmountEuros,
          stripe_amount: stripeAmountEuros,
          message: `Paiement mixte: ${walletAmountEuros}€ depuis la cagnotte, ${stripeAmountEuros}€ par carte`,
        })
      }

      // Cas 3: Paiement entièrement par Stripe (méthode existante)
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
        capture_method: 'manual',
      })

      livraison.paymentStatus = 'pending'
      livraison.paymentIntentId = paymentIntent.id
      livraison.amount = totalAmount
      await livraison.save()

      return response.ok({
        success: true,
        paymentMethod: 'stripe',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        message: 'Paiement Stripe créé en escrow',
      })
    } catch (error) {
      console.error('❌ Erreur création paiement livraison avec cagnotte:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du paiement',
        error: error.message,
      })
    }
  }

  /**
   * 🔧 CRÉER PAIEMENT SERVICE AVEC OPTION CAGNOTTE
   * Pour les services proposés par les prestataires clients
   */
  async createServicePaymentWithWallet({ request, response, auth }: HttpContext) {
    try {
      const {
        amount,
        service_id: serviceId,
        description,
        paymentMethod,
        walletAmount,
      } = request.only(['amount', 'service_id', 'description', 'paymentMethod', 'walletAmount'])

      const utilisateur = await auth.authenticate()
      if (!utilisateur) {
        return response.unauthorized({ success: false, message: 'Utilisateur non authentifié' })
      }

      // Vérifier que le service existe
      const ServiceModel = await import('#models/service')
      const Service = ServiceModel.default
      const service = await Service.find(serviceId)
      if (!service) {
        return response.badRequest({
          success: false,
          message: 'Service introuvable',
        })
      }

      const totalAmount = Number(amount) / 100

      // Paiement depuis la cagnotte
      if (paymentMethod === 'wallet') {
        const PortefeuilleEcodeli = await import('#models/portefeuille_ecodeli')
        const PortefeuilleModel = PortefeuilleEcodeli.default
        const TransactionPortefeuille = await import('#models/transaction_portefeuille')
        const TransactionModel = TransactionPortefeuille.default

        const portefeuille = await PortefeuilleModel.query()
          .where('utilisateur_id', utilisateur.id)
          .where('is_active', true)
          .first()

        if (!portefeuille) {
          return response.badRequest({
            success: false,
            message: 'Portefeuille non trouvé',
          })
        }

        if (portefeuille.soldeDisponible < totalAmount) {
          return response.badRequest({
            success: false,
            message: `Solde insuffisant. Disponible: ${portefeuille.soldeDisponible}€, Demandé: ${totalAmount}€`,
          })
        }

        const ancienSolde = portefeuille.soldeDisponible
        await portefeuille.retirerFonds(totalAmount)

        await TransactionModel.create({
          portefeuilleId: portefeuille.id,
          utilisateurId: utilisateur.id,
          typeTransaction: 'debit',
          montant: totalAmount,
          soldeAvant: ancienSolde,
          soldeApres: portefeuille.soldeDisponible,
          description: description || `Service #${serviceId}`,
          referenceExterne: serviceId.toString(),
          statut: 'completed',
          metadata: JSON.stringify({
            payment_method: 'wallet',
            type: 'service',
            reference_id: serviceId.toString(),
          }),
        })

        // Mettre à jour le service
        service.status = 'paid'
        await service.save()

        return response.ok({
          success: true,
          message: 'Paiement service effectué depuis la cagnotte',
          paymentMethod: 'wallet',
          data: {
            montant_paye: totalAmount,
            nouveau_solde: portefeuille.soldeDisponible,
          },
        })
      }

      // Paiement Stripe standard
      const paymentIntent = await StripeService.createServicePayment(
        utilisateur,
        Number(amount),
        serviceId,
        description
      )

      return response.ok({
        success: true,
        paymentMethod: 'stripe',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })
    } catch (error) {
      console.error('❌ Erreur création paiement service avec cagnotte:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du paiement service',
        error: error.message,
      })
    }
  }

  /**
   * 📊 OBTENIR SOLDE CAGNOTTE CLIENT
   * Pour afficher le solde disponible dans l'interface de paiement
   */
  async getClientWalletBalance({ response, auth }: HttpContext) {
    try {
      const utilisateur = await auth.authenticate()
      if (!utilisateur) {
        return response.unauthorized({ success: false, message: 'Utilisateur non authentifié' })
      }

      const PortefeuilleEcodeli = await import('#models/portefeuille_ecodeli')
      const PortefeuilleModel = PortefeuilleEcodeli.default

      const portefeuille = await PortefeuilleModel.query()
        .where('utilisateur_id', utilisateur.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        return response.ok({
          success: true,
          data: {
            solde_disponible: 0,
            solde_en_attente: 0,
            solde_total: 0,
            has_wallet: false,
          },
        })
      }

      return response.ok({
        success: true,
        data: {
          solde_disponible: portefeuille.soldeDisponible,
          solde_en_attente: portefeuille.soldeEnAttente,
          solde_total: portefeuille.soldeTotal,
          has_wallet: true,
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération solde cagnotte:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération du solde',
        error: error.message,
      })
    }
  }
}
