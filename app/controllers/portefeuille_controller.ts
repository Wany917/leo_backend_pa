import type { HttpContext } from '@adonisjs/core/http'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'
import Utilisateurs from '#models/utilisateurs'
import Client from '#models/client'
import StripeService from '#services/stripe_service'

export default class PortefeuilleController {
  /**
   * Récupérer le portefeuille d'un utilisateur
   */
  public async show({ params, response, auth }: HttpContext) {
    try {
      // Si pas de userId dans params, utiliser l'utilisateur connecté
      const userId = params.userId || auth.user?.id

      if (!userId) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non identifié',
        })
      }

      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .first()

      // Si pas de portefeuille, en créer un
      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: userId,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      return response.ok({
        success: true,
        data: {
          id: portefeuille.id,
          soldeDisponible: portefeuille.soldeDisponible,
          soldeEnAttente: portefeuille.soldeEnAttente,
          soldeTotal: portefeuille.soldeTotal,
          virementAutoActif: portefeuille.virementAutoActif,
          seuilVirementAuto: portefeuille.seuilVirementAuto,
          iban: portefeuille.iban ? `****${portefeuille.iban.slice(-4)}` : null,
        },
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Erreur lors de la récupération du portefeuille',
        error: error.message,
      })
    }
  }

  /**
   * Configurer le virement automatique
   */
  public async configureVirementAuto({ request, params, response }: HttpContext) {
    try {
      const { userId } = params
      const { iban, bic, seuil } = request.only(['iban', 'bic', 'seuil'])

      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .firstOrFail()

      await portefeuille.configurerVirementAuto(iban, bic, seuil)

      return response.ok({
        success: true,
        message: 'Virement automatique configuré avec succès',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Erreur lors de la configuration du virement automatique',
        error: error.message,
      })
    }
  }

  /**
   * Désactiver le virement automatique
   */
  public async desactiverVirementAuto({ params, response }: HttpContext) {
    try {
      const { userId } = params

      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .firstOrFail()

      await portefeuille.desactiverVirementAuto()

      return response.ok({
        success: true,
        message: 'Virement automatique désactivé',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Erreur lors de la désactivation du virement automatique',
        error: error.message,
      })
    }
  }

  /**
   * Historique des transactions
   */
  public async historique({ params, request, response }: HttpContext) {
    try {
      const { userId } = params
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)

      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .firstOrFail()

      const transactions = await TransactionPortefeuille.query()
        .where('portefeuille_id', portefeuille.id)
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      return response.ok({
        success: true,
        data: transactions,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: "Erreur lors de la récupération de l'historique",
        error: error.message,
      })
    }
  }

  /**
   * Demander un virement manuel
   */
  public async demanderVirement({ params, request, response }: HttpContext) {
    try {
      const { userId } = params
      const { montant, iban, bic } = request.only(['montant', 'iban', 'bic'])

      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .firstOrFail()

      if (portefeuille.soldeDisponible < montant) {
        return response.badRequest({
          success: false,
          message: 'Solde insuffisant',
        })
      }

      // Créer transaction en attente
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: userId,
        typeTransaction: 'virement',
        montant: montant,
        soldeAvant: portefeuille.soldeDisponible,
        soldeApres: portefeuille.soldeDisponible - montant,
        description: `Demande de virement vers ${iban}`,
        statut: 'pending',
        metadata: JSON.stringify({ iban, bic }),
      })

      // Bloquer les fonds
      await portefeuille.retirerFonds(montant)

      return response.ok({
        success: true,
        message: 'Demande de virement enregistrée, traitement sous 48h',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Erreur lors de la demande de virement',
        error: error.message,
      })
    }
  }

  /**
   * Statistiques pour admin
   */
  public async statistiques({ response }: HttpContext) {
    try {
      const stats = await PortefeuilleEcodeli.query()
        .where('is_active', true)
        .sum('solde_disponible as totalSoldeDisponible')
        .sum('solde_en_attente as totalSoldeEnAttente')
        .count('* as nombrePortefeuilles')
        .first()

      const transactionsStats = await TransactionPortefeuille.query()
        .where('created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .groupBy('type_transaction')
        .select('type_transaction')
        .count('* as count')
        .sum('montant as total')

      return response.ok({
        success: true,
        data: {
          portefeuilles: stats,
          transactions30j: transactionsStats,
        },
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message,
      })
    }
  }

  // ===============================================
  // 🆕 SYSTÈME CAGNOTTE CLIENT MULTI-RÔLES
  // ===============================================

  /**
   * 💰 RECHARGER LA CAGNOTTE CLIENT
   * Permet aux clients d'ajouter des fonds à leur cagnotte via Stripe
   */
  public async rechargerCagnotte({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { montant } = request.only(['montant'])

      if (!montant || montant <= 0) {
        return response.badRequest({
          success: false,
          message: 'Montant invalide pour la recharge',
        })
      }

      // Vérifier que l'utilisateur est un client
      const client = await Client.query().where('id', user.id).first()
      if (!client) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non trouvé en tant que client',
        })
      }

      // Créer un Payment Intent pour la recharge (capture automatique)
      const paymentIntent = await StripeService.createWalletRechargePayment(
        user,
        Math.round(montant * 100), // Convertir en centimes
        `Recharge cagnotte EcoDeli - ${montant}€`
      )

      return response.ok({
        success: true,
        message: 'Payment Intent créé pour la recharge',
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          amount: montant,
        },
      })
    } catch (error) {
      console.error('❌ Erreur recharge cagnotte:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la recharge de la cagnotte',
        error: error.message,
      })
    }
  }

  /**
   * ✅ CONFIRMER RECHARGE CAGNOTTE
   * Ajoute les fonds au portefeuille après paiement Stripe réussi
   */
  public async confirmerRechargeCagnotte({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { payment_intent_id: paymentIntentId } = request.only(['payment_intent_id'])

      console.log('🔄 Confirmation recharge cagnotte:', { paymentIntentId, userId: user.id })

      if (!paymentIntentId) {
        return response.badRequest({
          success: false,
          message: 'Payment Intent ID requis',
        })
      }

      // Vérifier le statut du paiement (pour recharge, on attend 'succeeded')
      const paymentStatus = await StripeService.checkPaymentEscrowStatus(paymentIntentId)

      if (paymentStatus.status !== 'succeeded') {
        return response.badRequest({
          success: false,
          message: `Le paiement n'a pas encore été confirmé. Statut actuel: ${paymentStatus.status}`,
          debug: {
            payment_intent_id: paymentIntentId,
            status: paymentStatus.status,
            metadata: paymentStatus.metadata,
          },
        })
      }

      // Récupérer ou créer le portefeuille
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: user.id,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      // Ajouter les fonds directement au solde disponible (pas d'escrow pour les recharges)
      const montantRecharge = paymentStatus.amount
      const ancienSolde = portefeuille.soldeDisponible

      portefeuille.soldeDisponible = ancienSolde + montantRecharge
      await portefeuille.save()

      // Enregistrer la transaction
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: user.id,
        typeTransaction: 'credit',
        montant: montantRecharge,
        soldeAvant: ancienSolde,
        soldeApres: portefeuille.soldeDisponible,
        description: `Recharge cagnotte via Stripe - ${montantRecharge}€`,
        referenceExterne: paymentIntentId,
        statut: 'completed',
        metadata: JSON.stringify({
          type: 'wallet_recharge',
          stripe_payment_intent: paymentIntentId,
        }),
      })

      console.log(`✅ Cagnotte rechargée: ${montantRecharge}€ pour client ${user.id}`)

      return response.ok({
        success: true,
        message: `Cagnotte rechargée de ${montantRecharge}€ avec succès`,
        data: {
          montant_recharge: montantRecharge,
          nouveau_solde: portefeuille.soldeDisponible,
        },
      })
    } catch (error) {
      console.error('❌ Erreur confirmation recharge:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la confirmation de la recharge',
        error: error.message,
      })
    }
  }

  /**
   * 💸 PAYER DEPUIS LA CAGNOTTE
   * Permet aux clients de payer leurs livraisons/services depuis leur cagnotte
   */
  public async payerDepuisCagnotte({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { montant, description, type, referenceId } = request.only([
        'montant',
        'description',
        'type',
        'referenceId',
      ])

      if (!montant || montant <= 0) {
        return response.badRequest({
          success: false,
          message: 'Montant invalide',
        })
      }

      if (!['livraison', 'service'].includes(type)) {
        return response.badRequest({
          success: false,
          message: 'Type de paiement invalide (livraison ou service)',
        })
      }

      // Récupérer le portefeuille
      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        return response.badRequest({
          success: false,
          message: 'Portefeuille non trouvé',
        })
      }

      // Vérifier le solde disponible
      if (portefeuille.soldeDisponible < montant) {
        return response.badRequest({
          success: false,
          message: `Solde insuffisant. Disponible: ${portefeuille.soldeDisponible}€, Demandé: ${montant}€`,
        })
      }

      // Débiter le portefeuille
      const ancienSolde = portefeuille.soldeDisponible
      await portefeuille.retirerFonds(montant)

      // Enregistrer la transaction
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: user.id,
        typeTransaction: 'debit',
        montant: montant,
        soldeAvant: ancienSolde,
        soldeApres: portefeuille.soldeDisponible,
        description: description || `Paiement ${type} depuis cagnotte`,
        referenceExterne: referenceId,
        statut: 'completed',
        metadata: JSON.stringify({
          payment_method: 'wallet',
          type: type,
          reference_id: referenceId,
        }),
      })

      console.log(`💸 Paiement cagnotte: ${montant}€ pour ${type} ${referenceId}`)

      return response.ok({
        success: true,
        message: `Paiement de ${montant}€ effectué depuis la cagnotte`,
        data: {
          montant_paye: montant,
          nouveau_solde: portefeuille.soldeDisponible,
          type: type,
          reference: referenceId,
        },
      })
    } catch (error) {
      console.error('❌ Erreur paiement depuis cagnotte:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors du paiement depuis la cagnotte',
        error: error.message,
      })
    }
  }

  /**
   * 📊 RÉCUPÉRER GAINS CLIENT PRESTATAIRE
   * Pour les clients qui proposent des services
   */
  public async getGainsPrestataire({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      // Récupérer le portefeuille
      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        return response.ok({
          success: true,
          data: {
            gains_totaux: 0,
            gains_ce_mois: 0,
            nombre_services: 0,
            transactions: [],
          },
        })
      }

      // Récupérer les transactions de gains (crédits de services)
      const gainsTransactions = await TransactionPortefeuille.query()
        .where('portefeuille_id', portefeuille.id)
        .where('type_transaction', 'liberation')
        .whereRaw("metadata->>'type' = 'service_payment'")
        .orderBy('created_at', 'desc')

      const gainsTotaux = gainsTransactions.reduce((total, t) => total + t.montant, 0)

      // Gains du mois en cours
      const debutMois = new Date()
      debutMois.setDate(1)
      debutMois.setHours(0, 0, 0, 0)

      const gainsCeMois = gainsTransactions
        .filter((t) => new Date(t.createdAt.toString()) >= debutMois)
        .reduce((total, t) => total + t.montant, 0)

      return response.ok({
        success: true,
        data: {
          gains_totaux: gainsTotaux,
          gains_ce_mois: gainsCeMois,
          nombre_services: gainsTransactions.length,
          transactions: gainsTransactions.slice(0, 10), // 10 dernières transactions
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération gains:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des gains',
        error: error.message,
      })
    }
  }
}