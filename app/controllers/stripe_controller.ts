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
        message: error.message || 'Erreur lors de la création du checkout',
      })
    }
  }

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

  async downloadInvoice({ params, response, auth }: HttpContext) {
    try {
      const { invoiceId } = params
      const utilisateur = auth.user as Utilisateurs

      const invoice = await stripe.invoices.retrieve(invoiceId)

      if (!invoice.customer || invoice.customer !== utilisateur.stripeCustomerId) {
        return response.forbidden({
          success: false,
          message: 'Accès non autorisé à cette facture',
        })
      }

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

      const LivraisonModel = await import('#models/livraison')
      const Livraison = LivraisonModel.default
      const livraison = await Livraison.find(livraisonId)
      if (!livraison) {
        return response.badRequest({
          success: false,
          message: 'Livraison introuvable',
        })
      }

      if (livraison.clientId !== utilisateur.id) {
        return response.forbidden({
          success: false,
          message: 'Vous ne pouvez pas payer pour cette livraison',
        })
      }

      if (livraison.paymentStatus === 'paid') {
        return response.badRequest({
          success: false,
          message: 'Cette livraison est déjà payée',
        })
      }

      if (livraison.paymentIntentId && livraison.paymentStatus === 'unpaid') {
        try {
          const existingPI = await stripe.paymentIntents.retrieve(livraison.paymentIntentId)

          const reusableStatuses = [
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
          ] as const

          if (reusableStatuses.includes(existingPI.status as any)) {
            console.log(
              `↩️ Réutilisation du Payment Intent ${existingPI.id} pour la livraison ${livraisonId}`
            )
            return response.ok({
              success: true,
              client_secret: existingPI.client_secret,
              payment_intent_id: existingPI.id,
              reused: true,
            })
          }
        } catch (piError) {
          console.warn(
            "⚠️ Impossible de récupérer le Payment Intent existant, création d'un nouveau",
            piError
          )
        }
      }

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
      
      livraison.paymentIntentId = paymentIntent.id
      livraison.amount = Number(amount) / 100
      await livraison.save()

      console.log(
        `✅ Livraison ${livraisonId} mise à jour: payment_status=pending, payment_intent_id=${paymentIntent.id}`
      )

      console.log(' ESCROW: Fonds bloqués chez Stripe, pas encore dans le portefeuille')
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
            price: 9.90,
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
              max_packages_per_month: -1,
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

  async createLivraisonPaymentWithWallet({ request, response, auth }: HttpContext) {
    try {
      const {
        amount,
        livraison_id: livraisonId,
        description,
        paymentMethod,
        walletAmount,
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

      const LivraisonModel = await import('#models/livraison')
      const Livraison = LivraisonModel.default
      const livraison = await Livraison.find(livraisonId)
      if (!livraison) {
        return response.badRequest({
          success: false,
          message: 'Livraison introuvable',
        })
      }

      if (livraison.clientId !== utilisateur.id) {
        return response.forbidden({
          success: false,
          message: 'Vous ne pouvez pas payer pour cette livraison',
        })
      }

      const totalAmount = Number(amount) / 100 
      
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
          description: description || `Livraison #${livraisonId}`,
          referenceExterne: livraisonId.toString(),
          statut: 'completed',
          metadata: JSON.stringify({
            payment_method: 'wallet',
            type: 'livraison',
            reference_id: livraisonId.toString(),
          }),
        })

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

      if (paymentMethod === 'mixed' && walletAmount) {
        const walletAmountEuros = Number(walletAmount) / 100
        const stripeAmountEuros = totalAmount - walletAmountEuros

        if (stripeAmountEuros <= 0) {
          return response.badRequest({
            success: false,
            message: 'Le montant Stripe doit être positif pour un paiement mixte',
          })
        }

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

        const customerId = await StripeService.getOrCreateStripeCustomer(utilisateur)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(stripeAmountEuros * 100),
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
