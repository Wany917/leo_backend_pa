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

    console.log('🔍 DEBUG generate_code - userInfo:', userInfo)

    const userExists = await CodeTemporaire.query().where('user_info', userInfo).first()

    if (userExists) {
      console.log('🔍 DEBUG - Code exists, deleting old one')
      // Supprimer l'ancien code au lieu de rejeter
      await CodeTemporaire.query().where('user_info', userInfo).delete()
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('🔍 DEBUG - Generated code:', code)

    try {
      await CodeTemporaire.create({ user_info: userInfo, code })
      console.log('🔍 DEBUG - Code created successfully')
      return response.ok({ message: 'Code created successfully', code: code })
    } catch (error) {
      console.log('🔴 DEBUG - Error creating code:', error)
      return response.badRequest({ error_message: 'Failed to create code', error })
    }
  }

  /**
   * Validation de code avec libération automatique des fonds
   */
  async check_code({ request, response }: HttpContext) {
    try {
      const { user_info: userInfo, code } = await request.validateUsing(checkCodeValidator)

      // Paramètres optionnels pour la libération de fonds
      const { livraison_id: livraisonId, service_id: serviceId } = request.only([
        'livraison_id',
        'service_id',
      ])

      console.log('🔍 DEBUG check_code - userInfo received:', userInfo)
      console.log('🔍 DEBUG check_code - code received:', code)
      console.log('🔍 DEBUG check_code - livraisonId:', livraisonId, 'serviceId:', serviceId)

      // Regardons tous les codes en base pour ce user_info
      const allCodes = await CodeTemporaire.query().where('user_info', userInfo)

      console.log('🔍 DEBUG check_code - found codes in DB:', allCodes.length)
      if (allCodes.length > 0) {
        console.log('🔍 DEBUG check_code - first code details:', {
          stored_user_info: allCodes[0].user_info,
          stored_code: allCodes[0].code,
          received_code: code,
        })
      }

      const codeTemporaire = await CodeTemporaire.query()
        .where('user_info', userInfo)
        .where('code', code)
        .first()

      if (codeTemporaire) {
        console.log('🔍 DEBUG check_code - Code found and valid!')

        // Supprimer le code
        await CodeTemporaire.query().where('user_info', userInfo).where('code', code).delete()

        // NOUVELLE LOGIQUE : Libération automatique des fonds
        if (livraisonId) {
          // Récupérer le montant de la livraison
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
        console.log('🔴 DEBUG check_code - Code NOT found!')
        return response.badRequest({ error_message: 'Invalid code' })
      }
    } catch (error) {
      console.log('🔴 DEBUG check_code - Exception:', error)
      return response.badRequest({ error_message: 'Failed to check code', error: error.message })
    }
  }

  /**
   * Méthode spécialisée pour valider livraison + libérer fonds
   * Workflow selon cahier des charges page 15:
   * 1. Vérifier le code de validation
   * 2. Capturer le paiement Stripe (libérer l'escrow)
   * 3. Ajouter les fonds au portefeuille du livreur
   * 4. Mettre à jour le statut de la livraison
   */
  async validateDelivery({ request, response }: HttpContext) {
    try {
      const {
        user_info: userInfo,
        code,
        livraison_id: livraisonId,
      } = request.only(['user_info', 'code', 'livraison_id'])

      console.log('🚀 VALIDATION LIVRAISON - userInfo:', userInfo, 'livraisonId:', livraisonId)

      // Vérifier le code
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

      // Récupérer la livraison avec toutes les relations nécessaires
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

      // Vérifier que la livraison a un Payment Intent
      if (!livraison.paymentIntentId) {
        return response.badRequest({
          success: false,
          message: 'Aucun paiement associé à cette livraison',
        })
      }

      const montantALiberer = livraison.amount || 0
      console.log('💰 Montant à libérer depuis la livraison:', montantALiberer, '€')

      if (montantALiberer <= 0) {
        return response.badRequest({
          success: false,
          message: 'Aucun montant à libérer pour cette livraison',
        })
      }

      // 🔒 ÉTAPE 1: CAPTURER LE PAIEMENT STRIPE (libérer l'escrow)
      console.log('🏦 Capture du paiement Stripe:', livraison.paymentIntentId)

      const StripeService = await import('#services/stripe_service')
      try {
        await StripeService.default.capturePaymentAfterDeliveryValidation(
          livraison.paymentIntentId,
          livraisonId
        )
        console.log('✅ Paiement Stripe capturé avec succès')
      } catch (stripeError) {
        console.error('❌ Erreur capture Stripe:', stripeError)
        return response.internalServerError({
          success: false,
          message: 'Erreur lors de la capture du paiement Stripe',
          error: stripeError.message,
        })
      }

      // 🔒 ÉTAPE 1.5: GÉNÉRER UNE FACTURE STRIPE OFFICIELLE
      let stripeInvoiceId: string | null = null
      try {
        console.log('📄 Génération facture Stripe pour la livraison')

        // Récupérer le Payment Intent pour avoir le customer
        const stripeModule = await import('#config/stripe')
        const stripe = stripeModule.default
        const paymentIntent = await stripe.paymentIntents.retrieve(livraison.paymentIntentId)

        if (paymentIntent.customer) {
          // Créer la facture Stripe
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

          // Ajouter une ligne à la facture
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

          // Finaliser la facture
          if (invoice.id) {
            const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

            stripeInvoiceId = finalizedInvoice.id || null
            console.log('✅ Facture Stripe générée:', stripeInvoiceId)

            // TODO: Ajouter le champ stripeInvoiceId au modèle Livraison si nécessaire
            // livraison.stripeInvoiceId = stripeInvoiceId
          }
        } else {
          console.warn('⚠️ Pas de customer associé au Payment Intent, facture non générée')
        }
      } catch (invoiceError) {
        console.error('❌ Erreur génération facture Stripe:', invoiceError)
        // Ne pas bloquer le processus pour une erreur de facture
      }

      // 🔒 ÉTAPE 2: LIBÉRER LES FONDS DANS LE PORTEFEUILLE
      await this.libererFondsLivraison(livraisonId, montantALiberer)
      console.log('✅ FONDS LIBÉRÉS DANS LE PORTEFEUILLE')

      // 🔒 ÉTAPE 3: METTRE À JOUR LE STATUT DE LA LIVRAISON
      livraison.paymentStatus = 'paid'
      await livraison.save()
      console.log('✅ Statut livraison mis à jour: paid')

      // 🔒 ÉTAPE 4: SUPPRIMER LE CODE TEMPORAIRE
      await CodeTemporaire.query().where('user_info', userInfo).where('code', code).delete()
      console.log('✅ Code temporaire supprimé')

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
      console.error('🔴 ERREUR VALIDATION LIVRAISON:', error)

      // 🚨 GESTION SPÉCIFIQUE DE L'ERREUR DE FONDS INSUFFISANTS
      if (error.message?.includes('Solde en attente insuffisant')) {
        return response.badRequest({
          success: false,
          message:
            "Les fonds ne sont pas encore disponibles. Cela peut arriver si le paiement n'a pas encore été traité par Stripe.",
          error_code: 'INSUFFICIENT_PENDING_BALANCE',
          details: 'Veuillez réessayer dans quelques minutes ou contacter le support.',
        })
      }

      // Autres erreurs
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

      console.log('🔍 DEBUG reset_code - userInfo:', userInfo)

      const codeTemporaire = await CodeTemporaire.query().where('user_info', userInfo).first()

      const newCode = Math.floor(100000 + Math.random() * 900000).toString()
      console.log('🔍 DEBUG reset_code - Generated new code:', newCode)

      if (codeTemporaire) {
        console.log('🔍 DEBUG reset_code - Existing code found, updating it')
        await CodeTemporaire.query().where('user_info', userInfo).update({ code: newCode })
      } else {
        console.log('🔍 DEBUG reset_code - No existing code, creating new one')
        await CodeTemporaire.create({ user_info: userInfo, code: newCode })
      }

      console.log('🔍 DEBUG reset_code - Code reset/created successfully')
      return response.ok({ message: 'Code reset successfully', code: newCode })
    } catch (error) {
      console.log('🔴 DEBUG reset_code - Exception:', error)
      return response.badRequest({ error_message: 'Failed to reset code', error: error })
    }
  }

  // ===============================================
  // MÉTHODES PRIVÉES - LOGIQUE MÉTIER
  // ===============================================

  /**
   * Libérer les fonds pour une livraison
   * Nouveau workflow escrow :
   * 1. Récupérer ou créer le portefeuille du livreur
   * 2. Ajouter les fonds en attente (venant de l'escrow Stripe)
   * 3. Libérer immédiatement les fonds (les rendre disponibles)
   * 4. Enregistrer les transactions
   */
  private async libererFondsLivraison(livraisonId: number, montantALiberer: number) {
    try {
      const livraison = await Livraison.query()
        .where('id', livraisonId)
        .preload('livreur')
        .preload('client')
        .firstOrFail()

      console.log('💰 LIBÉRATION FONDS LIVRAISON - Montant:', montantALiberer, '€')

      if (!montantALiberer) {
        throw new Error('Montant à libérer non défini')
      }

      if (!livraison.livreur?.id) {
        throw new Error('Livreur non trouvé')
      }

      // Récupérer ou créer le portefeuille du livreur
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', livraison.livreur.id)
        .where('is_active', true)
        .first()

      // Créer le portefeuille s'il n'existe pas
      if (!portefeuille) {
        console.log('📝 Création du portefeuille pour le livreur:', livraison.livreur.id)
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: livraison.livreur.id,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      console.log('🔍 Portefeuille avant opération:', {
        id: portefeuille.id,
        soldeDisponible: portefeuille.soldeDisponible,
        soldeEnAttente: portefeuille.soldeEnAttente,
      })

      // ÉTAPE 1: Ajouter les fonds en attente (venant de l'escrow Stripe)
      await portefeuille.ajouterFondsEnAttente(montantALiberer)
      console.log('✅ Fonds ajoutés en attente:', montantALiberer, '€')

      // ÉTAPE 2: Libérer immédiatement les fonds (les rendre disponibles)
      await portefeuille.libererFonds(montantALiberer)
      console.log('✅ Fonds libérés vers solde disponible:', montantALiberer, '€')

      // Recharger le portefeuille pour voir les changements finaux
      await portefeuille.refresh()
      console.log('🔍 Portefeuille après libération:', {
        id: portefeuille.id,
        soldeDisponible: portefeuille.soldeDisponible,
        soldeEnAttente: portefeuille.soldeEnAttente,
      })

      // Enregistrer la transaction de libération
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: livraison.livreur.id,
        typeTransaction: 'liberation',
        montant: montantALiberer,
        soldeAvant: portefeuille.soldeDisponible - montantALiberer,
        soldeApres: portefeuille.soldeDisponible,
        description: `Libération fonds livraison #${livraison.id} après validation code`,
        referenceExterne: livraison.paymentIntentId,
        livraisonId: livraison.id,
        statut: 'completed',
        metadata: JSON.stringify({
          type: 'escrow_release',
          validated_at: new Date().toISOString(),
          client_id: livraison.client?.id,
        }),
      })

      console.log(
        '✅ FONDS LIBÉRÉS - Livreur reçoit:',
        montantALiberer,
        '€ (maintenant disponible)'
      )
    } catch (error) {
      console.error('🔴 ERREUR LIBÉRATION FONDS LIVRAISON:', error)
      throw error
    }
  }

  /**
   * Libérer les fonds pour un service
   */
  private async libererFondsService(serviceId: number) {
    try {
      const service = await Service.query()
        .where('id', serviceId)
        .preload('prestataire')
        .firstOrFail()

      console.log('💰 LIBÉRATION FONDS SERVICE - Montant:', service.price, '€')

      if (!service.prestataire?.id) {
        throw new Error('Prestataire non trouvé')
      }

      // Récupérer le portefeuille du prestataire
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', service.prestataire.id)
        .where('is_active', true)
        .first()

      // Créer le portefeuille s'il n'existe pas
      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: service.prestataire.id,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      // Calculer commission EcoDeli (8% pour les services)
      const commission = service.price * 0.08
      const montantPrestataire = service.price - commission

      // Libérer les fonds
      await portefeuille.libererFonds(montantPrestataire)

      // Enregistrer la transaction
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

      console.log(
        '✅ FONDS LIBÉRÉS SERVICE - Prestataire reçoit:',
        montantPrestataire,
        '€, Commission:',
        commission,
        '€'
      )
    } catch (error) {
      console.error('🔴 ERREUR LIBÉRATION FONDS SERVICE:', error)
      throw error
    }
  }
}
