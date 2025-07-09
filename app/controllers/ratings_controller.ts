import type { HttpContext } from '@adonisjs/core/http'
import Rating from '#models/rating'
import Livreur from '#models/livreur'
import Prestataire from '#models/prestataire'
import Livraison from '#models/livraison'
import Service from '#models/service'
import { createRatingValidator, adminRatingResponseValidator } from '#validators/rating_validators'
import db from '@adonisjs/lucid/services/db'

export default class RatingsController {
  /**
   * @tag Ratings - Admin
   * @summary Lister tous les avis (Admin)
   * @description Récupère tous les avis avec filtres pour l'administration
   */
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const ratingType = request.input('rating_type')
      const ratingFilter = request.input('rating')
      const isVisible = request.input('is_visible')
      const hasAdminResponse = request.input('has_admin_response')
      const userId = request.input('user_id')

      // Utiliser des joins directs pour éviter les problèmes de relations
      let query = db
        .from('ratings')
        .select(
          'ratings.*',
          'reviewer.first_name as reviewer_first_name',
          'reviewer.last_name as reviewer_last_name',
          'reviewer.email as reviewer_email',
          'reviewed.first_name as reviewed_first_name',
          'reviewed.last_name as reviewed_last_name',
          'reviewed.email as reviewed_email'
        )
        .leftJoin('utilisateurs as reviewer', 'ratings.reviewer_id', 'reviewer.id')
        .leftJoin('utilisateurs as reviewed', 'ratings.reviewed_id', 'reviewed.id')
        .orderBy('ratings.created_at', 'desc')

      // Filtres
      if (ratingType) {
        const types = Array.isArray(ratingType) ? ratingType : [ratingType]
        query = query.whereIn('ratings.rating_type', types)
      }

      if (ratingFilter) {
        const ratingValues = Array.isArray(ratingFilter) ? ratingFilter : [ratingFilter]
        query = query.whereIn('ratings.overall_rating', ratingValues)
      }

      if (isVisible !== undefined) {
        query = query.where('ratings.is_visible', isVisible === 'true')
      }

      if (hasAdminResponse !== undefined) {
        if (hasAdminResponse === 'true') {
          query = query.whereNotNull('ratings.admin_response')
        } else {
          query = query.whereNull('ratings.admin_response')
        }
      }

      if (userId) {
        query = query.where('ratings.reviewed_id', userId)
      }

      const offset = (page - 1) * limit
      const ratingsData = await query.limit(limit).offset(offset)

      // Compter le total pour la pagination
      const totalQuery = db.from('ratings')
      if (ratingType) {
        const types = Array.isArray(ratingType) ? ratingType : [ratingType]
        totalQuery.whereIn('rating_type', types)
      }
      if (ratingFilter) {
        const ratingValues = Array.isArray(ratingFilter) ? ratingFilter : [ratingFilter]
        totalQuery.whereIn('overall_rating', ratingValues)
      }
      if (isVisible !== undefined) {
        totalQuery.where('is_visible', isVisible === 'true')
      }
      if (hasAdminResponse !== undefined) {
        if (hasAdminResponse === 'true') {
          totalQuery.whereNotNull('admin_response')
        } else {
          totalQuery.whereNull('admin_response')
        }
      }
      if (userId) {
        totalQuery.where('reviewed_id', userId)
      }
      const total = await totalQuery.count('* as count').first()

      // Enrichir les données avec les noms des éléments évalués
      const enrichedRatings = await Promise.all(
        ratingsData.map(async (ratingItem) => {
          let itemName = 'Élément supprimé'

          try {
            if (ratingItem.rating_type === 'service') {
              const service = await Service.find(ratingItem.rating_for_id)
              itemName = service ? service.name : 'Service supprimé'
            } else if (ratingItem.rating_type === 'delivery') {
              const livraison = await Livraison.find(ratingItem.rating_for_id)
              itemName = livraison ? `Livraison #${livraison.id}` : 'Livraison supprimée'
            }
          } catch (error) {
            // Garder le nom par défaut
          }

          return {
            id: ratingItem.id,
            rating_type: ratingItem.rating_type,
            rating: ratingItem.overall_rating,
            comment: ratingItem.comment,
            is_visible: ratingItem.is_visible,
            admin_response: ratingItem.admin_response,
            created_at: ratingItem.created_at,
            updated_at: ratingItem.updated_at,
            user_name:
              ratingItem.reviewed_first_name && ratingItem.reviewed_last_name
                ? `${ratingItem.reviewed_first_name} ${ratingItem.reviewed_last_name}`
                : 'Utilisateur supprimé',
            user_email: ratingItem.reviewed_email || 'N/A',
            item_name: itemName,
          }
        })
      )

      return response.ok({
        data: enrichedRatings,
        meta: {
          total: total?.count || 0,
          page: page,
          per_page: limit,
          last_page: Math.ceil((total?.count || 0) / limit),
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération ratings admin:', error)
      return response.internalServerError({
        error_message: 'Failed to fetch ratings',
        error: error.message,
      })
    }
  }

  /**
   * @tag Ratings - CRUD
   * @summary Créer une nouvelle évaluation
   * @description Permet à un client d'évaluer un livreur ou prestataire
   */
  async create({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const data = await request.validateUsing(createRatingValidator)

      // Vérifier que l'utilisateur peut évaluer
      const canRate = await this.canUserRate(user.id, data.rating_type, data.rating_for_id)
      if (!canRate.allowed) {
        return response.forbidden({
          success: false,
          message: canRate.reason,
        })
      }

      // Vérifier qu'une évaluation n'existe pas déjà
      const existingRating = await Rating.query()
        .where('reviewer_id', user.id)
        .where('rating_type', data.rating_type)
        .where('rating_for_id', data.rating_for_id)
        .first()

      if (existingRating) {
        return response.conflict({
          success: false,
          message: 'Vous avez déjà évalué cet élément',
        })
      }

      // Créer l'évaluation
      const rating = await Rating.create({
        reviewerId: user.id,
        reviewedId: data.reviewed_id,
        ratingType: data.rating_type,
        ratingForId: data.rating_for_id,
        overallRating: data.overall_rating,
        punctualityRating: data.punctuality_rating,
        qualityRating: data.quality_rating,
        communicationRating: data.communication_rating,
        valueRating: data.value_rating,
        comment: data.comment,
        isVerifiedPurchase: true,
      })

      // Mettre à jour le rating moyen du livreur/prestataire
      await this.updateAverageRating(data.reviewed_id, data.rating_type)

      return response.created({
        success: true,
        message: 'Évaluation créée avec succès',
        rating: rating.serialize(),
      })
    } catch (error) {
      console.error('❌ Erreur création rating:', error)
      return response.internalServerError({
        success: false,
        message: "Erreur lors de la création de l'évaluation",
        error: error.message,
      })
    }
  }

  /**
   * @tag Ratings - Lecture
   * @summary Récupérer les évaluations d'un utilisateur
   * @description Récupère toutes les évaluations reçues par un livreur/prestataire
   */
  async getByUser({ request, response }: HttpContext) {
    try {
      const userId = request.param('userId')
      const ratingType = request.input('type') // 'delivery' ou 'service'
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)

      let query = Rating.query()
        .where('reviewed_id', userId)
        .where('is_visible', true)
        .preload('reviewer', (reviewerQuery) => {
          reviewerQuery.select('id', 'first_name', 'last_name')
        })
        .orderBy('created_at', 'desc')

      if (ratingType) {
        query = query.where('rating_type', ratingType)
      }

      const ratings = await query.paginate(page, limit)

      // Calculer les statistiques
      const stats = await this.getRatingStats(userId, ratingType)

      return response.ok({
        success: true,
        ratings: ratings.serialize(),
        stats,
      })
    } catch (error) {
      console.error('❌ Erreur récupération ratings:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des évaluations',
      })
    }
  }

  /**
   * @tag Ratings - Lecture
   * @summary Récupérer les évaluations d'une livraison/service
   * @description Récupère les évaluations pour une livraison ou service spécifique
   */
  async getByItem({ request, response }: HttpContext) {
    try {
      const itemId = request.param('itemId')
      const ratingType = request.param('type') // 'delivery' ou 'service'

      const ratings = await Rating.query()
        .where('rating_for_id', itemId)
        .where('rating_type', ratingType)
        .where('is_visible', true)
        .preload('reviewer', (reviewerQuery) => {
          reviewerQuery.select('id', 'first_name', 'last_name')
        })
        .preload('reviewed', (reviewedQuery) => {
          reviewedQuery.select('id', 'first_name', 'last_name')
        })
        .orderBy('created_at', 'desc')

      return response.ok({
        success: true,
        ratings: ratings.map((rating) => ({
          ...rating.serialize(),
          reviewer_id: rating.reviewerId, // 🌟 AJOUT: ID du reviewer pour identifier les ratings de l'utilisateur
        })),
      })
    } catch (error) {
      console.error('❌ Erreur récupération ratings item:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des évaluations',
      })
    }
  }

  /**
   * @tag Ratings - Statistiques
   * @summary Statistiques détaillées des évaluations
   * @description Récupère les statistiques complètes d'un livreur/prestataire
   */
  async getStats({ request, response }: HttpContext) {
    try {
      const userId = request.param('userId')
      const ratingType = request.input('type')

      const stats = await this.getRatingStats(userId, ratingType)

      return response.ok({
        success: true,
        stats,
      })
    } catch (error) {
      console.error('❌ Erreur stats ratings:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
      })
    }
  }

  /**
   * @tag Ratings - Consultation
   * @summary Vérifier si l'utilisateur connecté a déjà évalué un élément spécifique
   */
  async checkUserRating({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { type, itemId } = request.params()

      if (!['delivery', 'service'].includes(type)) {
        return response.badRequest({
          success: false,
          message: 'Type invalide. Utilisez "delivery" ou "service"',
        })
      }

      const existingRating = await Rating.query()
        .where('reviewer_id', user.id)
        .where('rating_type', type)
        .where('rating_for_id', itemId)
        .first()

      return response.ok({
        success: true,
        has_rated: !!existingRating,
        rating: existingRating
          ? {
              id: existingRating.id,
              overall_rating: existingRating.overallRating,
              punctuality_rating: existingRating.punctualityRating,
              quality_rating: existingRating.qualityRating,
              communication_rating: existingRating.communicationRating,
              comment: existingRating.comment,
              created_at: existingRating.createdAt,
            }
          : null,
      })
    } catch (error) {
      console.error('❌ Erreur vérification rating utilisateur:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la vérification',
      })
    }
  }

  /**
   * @tag Ratings - Admin
   * @summary Répondre à une évaluation (Admin)
   * @description Permet aux admins de répondre à une évaluation
   */
  async adminResponse({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const ratingId = request.param('ratingId')
      const { admin_response: adminResponse } = await request.validateUsing(
        adminRatingResponseValidator
      )

      // Vérifier que l'utilisateur est admin
      const isAdmin = await user.related('admin').query().first()
      if (!isAdmin) {
        return response.forbidden({
          success: false,
          message: 'Accès réservé aux administrateurs',
        })
      }

      const rating = await Rating.findOrFail(ratingId)

      rating.adminResponse = adminResponse
      rating.adminResponseAt = new Date()
      await rating.save()

      return response.ok({
        success: true,
        message: 'Réponse admin ajoutée avec succès',
        rating: rating.serialize(),
      })
    } catch (error) {
      console.error('❌ Erreur réponse admin:', error)
      return response.internalServerError({
        success: false,
        message: "Erreur lors de l'ajout de la réponse",
      })
    }
  }

  /**
   * @tag Ratings - Modération
   * @summary Masquer/Afficher une évaluation
   * @description Permet aux admins de modérer les évaluations
   */
  async toggleVisibility({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const ratingId = request.param('ratingId')

      // Vérifier que l'utilisateur est admin
      const isAdmin = await user.related('admin').query().first()
      if (!isAdmin) {
        return response.forbidden({
          success: false,
          message: 'Accès réservé aux administrateurs',
        })
      }

      const rating = await Rating.findOrFail(ratingId)
      rating.isVisible = !rating.isVisible
      await rating.save()

      return response.ok({
        success: true,
        message: `Évaluation ${rating.isVisible ? 'affichée' : 'masquée'} avec succès`,
        rating: rating.serialize(),
      })
    } catch (error) {
      console.error('❌ Erreur modération rating:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la modération',
      })
    }
  }

  // =============================================================================
  // MÉTHODES PRIVÉES
  // =============================================================================

  /**
   * Vérifier si un utilisateur peut évaluer un élément
   */
  private async canUserRate(
    userId: number,
    ratingType: string,
    ratingForId: number
  ): Promise<{
    allowed: boolean
    reason?: string
  }> {
    try {
      if (ratingType === 'delivery') {
        // Vérifier que l'utilisateur est le client de la livraison
        const livraison = await Livraison.query()
          .where('id', ratingForId)
          .where('client_id', userId)
          .where('status', 'completed') // Seules les livraisons terminées peuvent être évaluées
          .first()

        if (!livraison) {
          return {
            allowed: false,
            reason: 'Vous ne pouvez évaluer que vos propres livraisons terminées',
          }
        }

        return { allowed: true }
      }

      if (ratingType === 'service') {
        // Vérifier que l'utilisateur a réservé ce service
        const service = await Service.query()
          .where('id', ratingForId)
          .where('client_id', userId)
          .where('status', 'completed')
          .first()

        if (!service) {
          return {
            allowed: false,
            reason: 'Vous ne pouvez évaluer que vos propres services terminés',
          }
        }

        return { allowed: true }
      }

      return {
        allowed: false,
        reason: "Type d'évaluation non supporté",
      }
    } catch (error) {
      console.error('Erreur vérification droit évaluation:', error)
      return {
        allowed: false,
        reason: 'Erreur lors de la vérification des droits',
      }
    }
  }

  /**
   * Mettre à jour le rating moyen d'un utilisateur
   */
  private async updateAverageRating(userId: number, ratingType: string): Promise<void> {
    try {
      const avgRating = await Rating.query()
        .where('reviewed_id', userId)
        .where('rating_type', ratingType)
        .where('is_visible', true)
        .avg('overall_rating as average')
        .first()

      const average = Number(avgRating?.$extras.average || 0)

      if (ratingType === 'delivery') {
        const livreur = await Livreur.find(userId)
        if (livreur) {
          livreur.rating = Math.round(average * 10) / 10 // Arrondir à 1 décimale
          await livreur.save()
        }
      } else if (ratingType === 'service') {
        const prestataire = await Prestataire.find(userId)
        if (prestataire) {
          prestataire.rating = Math.round(average * 10) / 10
          await prestataire.save()
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour rating moyen:', error)
    }
  }

  /**
   * Récupérer les statistiques détaillées des ratings
   */
  private async getRatingStats(userId: number, ratingType?: string): Promise<any> {
    try {
      let query = Rating.query().where('reviewed_id', userId).where('is_visible', true)

      if (ratingType) {
        query = query.where('rating_type', ratingType)
      }

      const [
        totalRatings,
        averageOverall,
        averagePunctuality,
        averageQuality,
        averageCommunication,
        averageValue,
        ratingDistribution,
      ] = await Promise.all([
        query.clone().count('* as total'),
        query.clone().avg('overall_rating as average'),
        query.clone().avg('punctuality_rating as average'),
        query.clone().avg('quality_rating as average'),
        query.clone().avg('communication_rating as average'),
        query.clone().avg('value_rating as average'),
        query
          .clone()
          .select('overall_rating')
          .groupBy('overall_rating')
          .count('* as count')
          .orderBy('overall_rating', 'desc'),
      ])

      return {
        total_ratings: Number(totalRatings[0].$extras.total),
        averages: {
          overall: Math.round((Number(averageOverall[0].$extras.average) || 0) * 10) / 10,
          punctuality: Math.round((Number(averagePunctuality[0].$extras.average) || 0) * 10) / 10,
          quality: Math.round((Number(averageQuality[0].$extras.average) || 0) * 10) / 10,
          communication:
            Math.round((Number(averageCommunication[0].$extras.average) || 0) * 10) / 10,
          value: Math.round((Number(averageValue[0].$extras.average) || 0) * 10) / 10,
        },
        distribution: ratingDistribution.map((item) => ({
          rating: item.overallRating,
          count: Number(item.$extras.count),
        })),
      }
    } catch (error) {
      console.error('Erreur calcul stats:', error)
      return {
        total_ratings: 0,
        averages: {
          overall: 0,
          punctuality: 0,
          quality: 0,
          communication: 0,
          value: 0,
        },
        distribution: [],
      }
    }
  }
}
