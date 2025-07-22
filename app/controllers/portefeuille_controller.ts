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
      console.log('🔍 DEBUG BACKEND - PortefeuilleController.show - DÉBUT');
      
      // Si pas de userId dans params, utiliser l'utilisateur connecté
      const userId = params.userId || auth.user?.id
      console.log('🔍 DEBUG BACKEND - userId:', userId);
      console.log('🔍 DEBUG BACKEND - params.userId:', params.userId);
      console.log('🔍 DEBUG BACKEND - auth.user?.id:', auth.user?.id);

      if (!userId) {
        console.log('❌ DEBUG BACKEND - Utilisateur non identifié');
        return response.badRequest({
          success: false,
          message: 'Utilisateur non identifié',
        })
      }

      console.log('🔍 DEBUG BACKEND - Recherche portefeuille pour userId:', userId);
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .first()

      console.log('🔍 DEBUG BACKEND - Portefeuille trouvé:', !!portefeuille);
      if (portefeuille) {
        console.log('🔍 DEBUG BACKEND - Solde disponible actuel:', portefeuille.soldeDisponible);
        console.log('🔍 DEBUG BACKEND - Solde en attente actuel:', portefeuille.soldeEnAttente);
      }

      // Si pas de portefeuille, en créer un
      if (!portefeuille) {
        console.log('🔍 DEBUG BACKEND - Création nouveau portefeuille');
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: userId,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
        console.log('🔍 DEBUG BACKEND - Nouveau portefeuille créé avec ID:', portefeuille.id);
      }

      const responseData = {
        id: portefeuille.id,
        soldeDisponible: portefeuille.soldeDisponible,
        soldeEnAttente: portefeuille.soldeEnAttente,
        soldeTotal: portefeuille.soldeTotal,
        virementAutoActif: portefeuille.virementAutoActif,
        seuilVirementAuto: portefeuille.seuilVirementAuto,
        iban: portefeuille.iban ? `****${portefeuille.iban.slice(-4)}` : null,
      };
      
      console.log('✅ DEBUG BACKEND - Données retournées:', responseData);
      console.log('✅ DEBUG BACKEND - PortefeuilleController.show - FIN');

      return response.ok({
        success: true,
        data: responseData,
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
        Math.round(montant * 100), // Convertir en centimes pour Stripe
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
      console.log('🔍 DEBUG BACKEND - confirmerRechargeCagnotte - DÉBUT');
      
      const user = auth.user!
      const { payment_intent_id: paymentIntentId } = request.only(['payment_intent_id'])
      
      console.log('🔍 DEBUG BACKEND - user.id:', user.id);
      console.log('🔍 DEBUG BACKEND - paymentIntentId:', paymentIntentId);

      if (!paymentIntentId) {
        console.log('❌ DEBUG BACKEND - Payment Intent ID manquant');
        return response.badRequest({
          success: false,
          message: 'Payment Intent ID requis',
        })
      }

      // Vérifier le statut du paiement (pour recharge, on attend 'succeeded')
      console.log('🔍 DEBUG BACKEND - Vérification statut paiement...');
      const paymentStatus = await StripeService.checkPaymentEscrowStatus(paymentIntentId)
      console.log('🔍 DEBUG BACKEND - Statut paiement:', paymentStatus.status);
      console.log('🔍 DEBUG BACKEND - Montant paiement:', paymentStatus.amount);
      console.log('🔍 DEBUG BACKEND - Metadata paiement:', paymentStatus.metadata);

      if (paymentStatus.status !== 'succeeded') {
        console.log('❌ DEBUG BACKEND - Paiement non confirmé, statut:', paymentStatus.status);
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
      console.log('🔍 DEBUG BACKEND - Recherche portefeuille pour user.id:', user.id);
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      console.log('🔍 DEBUG BACKEND - Portefeuille trouvé:', !!portefeuille);
      if (portefeuille) {
        console.log('🔍 DEBUG BACKEND - Solde disponible AVANT recharge:', portefeuille.soldeDisponible);
      }

      if (!portefeuille) {
        console.log('🔍 DEBUG BACKEND - Création nouveau portefeuille pour recharge');
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: user.id,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
        console.log('🔍 DEBUG BACKEND - Nouveau portefeuille créé avec ID:', portefeuille.id);
      }

      // Ajouter les fonds directement au solde disponible (pas d'escrow pour les recharges)
      const montantRecharge = Number(paymentStatus.amount)
      const ancienSolde = Number(portefeuille.soldeDisponible)
      
      console.log('🔍 DEBUG BACKEND - Montant à recharger:', montantRecharge);
      console.log('🔍 DEBUG BACKEND - Ancien solde:', ancienSolde);
      console.log('🔍 DEBUG BACKEND - Nouveau solde calculé:', ancienSolde + montantRecharge);

      portefeuille.soldeDisponible = ancienSolde + montantRecharge
      await portefeuille.save()
      
      console.log('🔍 DEBUG BACKEND - Portefeuille sauvegardé avec nouveau solde:', portefeuille.soldeDisponible);

      // Enregistrer la transaction
      console.log('🔍 DEBUG BACKEND - Création transaction de recharge...');
      const transaction = await TransactionPortefeuille.create({
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
      
      console.log('🔍 DEBUG BACKEND - Transaction créée avec ID:', transaction.id);
      console.log('✅ DEBUG BACKEND - Recharge terminée avec succès');
      console.log('✅ DEBUG BACKEND - confirmerRechargeCagnotte - FIN');

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
