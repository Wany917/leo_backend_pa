import type { HttpContext } from '@adonisjs/core/http'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'
import Utilisateurs from '#models/utilisateurs'

export default class PortefeuilleController {
  /**
   * Récupérer le portefeuille d'un utilisateur
   */
  public async show({ params, response }: HttpContext) {
    try {
      const { userId } = params

      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', userId)
        .where('is_active', true)
        .preload('utilisateur')
        .first()

      // Si pas de portefeuille, en créer un
      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: userId,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
        await portefeuille.load('utilisateur')
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
}
