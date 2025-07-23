import type { HttpContext } from '@adonisjs/core/http'
import CodeTemporaire from '#models/code_temporaire'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'
import Livraison from '#models/livraison'
import Service from '#models/service'
import { generateCodeValidator } from '#validators/generate_code'
import { checkCodeValidator } from '#validators/check_code'
import { DateTime } from 'luxon'

export default class CodeTemporairesController {
  async generate_code({ request, response }: HttpContext) {
    const { user_info: userInfo } = await request.validateUsing(generateCodeValidator)

    const userExists = await CodeTemporaire.query().where('user_info', userInfo).first()

    if (userExists) {
      await CodeTemporaire.query().where('user_info', userInfo).delete()
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    try {
      await CodeTemporaire.create({ user_info: userInfo, code })

      return response.ok({ message: 'Code created successfully', code: code })
    } catch (error) {
      return response.badRequest({ error_message: 'Failed to create code', error })
    }
  }

  async check_code({ request, response }: HttpContext) {
    try {
      const { user_info: userInfo, code } = await request.validateUsing(checkCodeValidator)

      const { livraison_id: livraisonId, service_id: serviceId } = request.only([
        'livraison_id',
        'service_id',
      ])

      const codeTemporaire = await CodeTemporaire.query()
        .where('user_info', userInfo)
        .where('code', code)
        .first()

      if (codeTemporaire) {
        await CodeTemporaire.query().where('user_info', userInfo).where('code', code).delete()

        if (livraisonId) {
          const livraison = await Livraison.find(livraisonId)
          if (livraison && livraison.amount) {
            await this.libererFondsLivraison(livraisonId, livraison.amount)
          }
        } else if (serviceId) {
          await this.libererFondsService(serviceId)
        }

        return response.ok({
          message: 'Code is valid',
          fundsReleased: !!(livraisonId || serviceId),
        })
      } else {
        return response.badRequest({ error_message: 'Invalid code' })
      }
    } catch (error) {
      return response.badRequest({ error_message: 'Failed to check code', error: error.message })
    }
  }

  async validateDelivery({ request, response }: HttpContext) {
    try {
      const {
        user_info: userInfo,
        code,
        livraison_id: livraisonId,
      } = request.only(['user_info', 'code', 'livraison_id'])

      const codeTemporaire = await CodeTemporaire.query()
        .where('user_info', userInfo)
        .where('code', code)
        .first()

      if (!codeTemporaire) {
        return response.badRequest({
          success: false,
          error_message: 'Code invalide',
          message: 'Le code de validation est incorrect ou expiré',
        })
      }

      const livraison = await Livraison.query()
        .where('id', livraisonId)
        .preload('livreur')
        .preload('client')
        .first()

      if (!livraison) {
        return response.badRequest({
          success: false,
          message: 'Livraison introuvable',
        })
      }

      if (!livraison.paymentIntentId) {
        return response.badRequest({
          success: false,
          message: 'Aucun paiement associé à cette livraison',
        })
      }

      if (livraison.paymentStatus === 'paid') {
        await CodeTemporaire.query().where('user_info', userInfo).where('code', code).delete()

        return response.ok({
          success: true,
          message: 'Livraison déjà validée',
          data: {
            payment_status: 'paid',
            livraison_id: livraison.id,
          },
        })
      }

      const montantALiberer = livraison.amount || 0

      if (montantALiberer <= 0) {
        return response.badRequest({
          success: false,
          message: 'Aucun montant à libérer pour cette livraison',
        })
      }

      const StripeService = await import('#services/stripe_service')
      try {
        await StripeService.default.capturePaymentAfterDeliveryValidation(
          livraison.paymentIntentId,
          livraisonId
        )
      } catch (stripeError) {
        return response.internalServerError({
          success: false,
          message: 'Erreur lors de la capture du paiement Stripe',
          error: stripeError.message,
        })
      }

      let stripeInvoiceId: string | null = null
      try {
        // Récupérer le Payment Intent pour avoir le customer
        const stripeModule = await import('#config/stripe')
        const stripe = stripeModule.default
        const paymentIntent = await stripe.paymentIntents.retrieve(livraison.paymentIntentId)

        if (paymentIntent.customer) {
          const invoice = await stripe.invoices.create({
            customer: paymentIntent.customer as string,
            description: `Livraison EcoDeli #${livraison.id}`,
            metadata: {
              type: 'livraison',
              livraison_id: livraisonId.toString(),
              payment_intent_id: livraison.paymentIntentId,
            },
            collection_method: 'charge_automatically',
            auto_advance: false, // Ne pas envoyer automatiquement
          })

          await stripe.invoiceItems.create({
            customer: paymentIntent.customer as string,
            invoice: invoice.id,
            amount: Math.round(montantALiberer * 100), // Convertir en centimes
            currency: 'eur',
            description: `Livraison: ${livraison.colis?.[0]?.contentDescription || 'Colis'} vers ${livraison.dropoffLocation || 'destination'}`,
            metadata: {
              livraison_id: livraisonId.toString(),
            },
          })

          if (invoice.id) {
            const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

            stripeInvoiceId = finalizedInvoice.id || null
          }
        }
      } catch (invoiceError) {}

      await this.libererFondsLivraison(livraisonId, montantALiberer)

      livraison.paymentStatus = 'paid'
      await livraison.save()

      await CodeTemporaire.query().where('user_info', userInfo).where('code', code).delete()

      return response.ok({
        success: true,
        message: 'Livraison validée avec succès ! Les fonds ont été libérés au livreur.',
        data: {
          montant_libere: montantALiberer,
          livreur_id: livraison.livreur?.id,
          payment_status: 'paid',
        },
      })
    } catch (error) {
      if (error.message?.includes('Solde en attente insuffisant')) {
        return response.badRequest({
          success: false,
          message:
            "Les fonds ne sont pas encore disponibles. Cela peut arriver si le paiement n'a pas encore été traité par Stripe.",
          error_code: 'INSUFFICIENT_PENDING_BALANCE',
          details: 'Veuillez réessayer dans quelques minutes ou contacter le support.',
        })
      }

      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la validation de la livraison',
        error: error.message,
      })
    }
  }

  async reset_code({ request, response }: HttpContext) {
    try {
      const { user_info: userInfo } = await request.validateUsing(generateCodeValidator)

      const codeTemporaire = await CodeTemporaire.query().where('user_info', userInfo).first()

      const newCode = Math.floor(100000 + Math.random() * 900000).toString()

      if (codeTemporaire) {
        await CodeTemporaire.query().where('user_info', userInfo).update({ code: newCode })
      } else {
        await CodeTemporaire.create({ user_info: userInfo, code: newCode })
      }

      return response.ok({ message: 'Code reset successfully', code: newCode })
    } catch (error) {
      return response.badRequest({ error_message: 'Failed to reset code', error: error })
    }
  }

  private async libererFondsLivraison(livraisonId: number, montantALiberer: number) {
    try {
      const livraison = await Livraison.query()
        .where('id', livraisonId)
        .preload('livreur')
        .preload('client')
        .firstOrFail()

      if (!montantALiberer) {
        throw new Error('Montant à libérer non défini')
      }

      if (!livraison.livreur?.id) {
        throw new Error('Livreur non trouvé')
      }
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', livraison.livreur.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: livraison.livreur.id,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      const LivreurModel = await import('#models/livreur')
      const Livreur = LivreurModel.default
      const livreur = await Livreur.find(livraison.livreur.id)

      const hasStripeConnect = livreur?.stripeAccountId
      let accountReady = false

      if (hasStripeConnect && livreur.stripeAccountId) {
        try {
          const StripeService = await import('#services/stripe_service')
          const accountStatus = await StripeService.default.checkAccountStatus(
            livreur.stripeAccountId
          )
          accountReady = accountStatus.payouts_enabled
        } catch (error) {}
      }

      if (hasStripeConnect && accountReady && livreur.stripeAccountId) {
        try {
          const StripeService = await import('#services/stripe_service')
          const transferResult = await StripeService.default.transferFromWalletToDeliveryman(
            montantALiberer,
            livreur.stripeAccountId,
            `Libération automatique fonds livraison #${livraisonId} après validation code`
          )
          await TransactionPortefeuille.create({
            portefeuilleId: portefeuille.id,
            utilisateurId: livraison.livreur.id,
            typeTransaction: 'virement', // Type: virement automatique
            montant: montantALiberer,
            soldeAvant: portefeuille.soldeDisponible,
            soldeApres: portefeuille.soldeDisponible, // Solde inchangé car transfer direct
            description: `Virement automatique livraison #${livraison.id} → compte bancaire`,
            referenceExterne: transferResult.transfer_id,
            livraisonId: livraison.id,
            statut: 'completed',
            metadata: JSON.stringify({
              type: 'auto_bank_transfer',
              stripe_account_id: livreur.stripeAccountId,
              transfer_id: transferResult.transfer_id,
              estimated_arrival: '1-3 jours ouvrés',
              validated_at: new Date().toISOString(),
              client_id: livraison.client?.id,
              sync_mode: 'direct_transfer',
            }),
          })
        } catch (transferError) {
          throw new Error(`Transfer automatique échoué: ${transferError.message}`)
        }
      } else {
        const ancienSolde = portefeuille.soldeDisponible
        await portefeuille.ajouterFondsEnAttente(montantALiberer)
        await portefeuille.libererFonds(montantALiberer)

        await TransactionPortefeuille.create({
          portefeuilleId: portefeuille.id,
          utilisateurId: livraison.livreur.id,
          typeTransaction: 'liberation',
          montant: montantALiberer,
          soldeAvant: ancienSolde,
          soldeApres: portefeuille.soldeDisponible,
          description: `💳 Fonds ajoutés au portefeuille - livraison #${livraison.id}`,
          referenceExterne: livraison.paymentIntentId,
          livraisonId: livraison.id,
          statut: 'completed',
          metadata: JSON.stringify({
            type: 'wallet_credit',
            reason: 'no_stripe_connect',
            validated_at: new Date().toISOString(),
            client_id: livraison.client?.id,
            sync_mode: 'wallet_virtual',
            next_step: 'manual_transfer_available',
          }),
        })
      }
    } catch (error) {
      throw error
    }
  }

  private async libererFondsService(serviceId: number) {
    try {
      const service = await Service.query()
        .where('id', serviceId)
        .preload('prestataire')
        .firstOrFail()

      if (!service.prestataire?.id) {
        throw new Error('Prestataire non trouvé')
      }
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', service.prestataire.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: service.prestataire.id,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      const commission = service.price * 0.08
      const montantPrestataire = service.price - commission

      await portefeuille.libererFonds(montantPrestataire)

      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: service.prestataire.id,
        typeTransaction: 'liberation',
        montant: montantPrestataire,
        soldeAvant: portefeuille.soldeDisponible - montantPrestataire,
        soldeApres: portefeuille.soldeDisponible,
        description: `Libération fonds service #${service.id}`,
        serviceId: service.id,
        statut: 'completed',
      })
    } catch (error) {
      throw error
    }
  }
}
