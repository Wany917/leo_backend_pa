import type { HttpContext } from '@adonisjs/core/http'
import Rating from '#models/rating'
import Livreur from '#models/livreur'
import Prestataire from '#models/prestataire'
import Livraison from '#models/livraison'
import Service from '#models/service'
import { createRatingValidator, adminRatingResponseValidator } from '#validators/rating_validators'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { ExtractModelRelations } from '@adonisjs/lucid/types/relations'

export default class RatingsController {
  /**
   * @tag Ratings - Public
   * @summary Lister tous les ratings (public)
   * @description Récupère tous les ratings avec les relations nécessaires pour les utilisateurs authentifiés.
   */
  async getAllRatings({ response }: HttpContext) {
    try {
      const ratings = await Rating.query()
        .preload('reviewer')
        .preload('reviewed')
        .orderBy('created_at', 'desc')

      const ratingsWithDetails = await Promise.all(
        ratings.map(async (rating) => {
          let itemName = `Item #${rating.ratingForId}`
          if (rating.ratingType === 'service') {
            const service = await Service.find(rating.ratingForId)
            if (service) itemName = service.name
          } else if (rating.ratingType === 'delivery') {
            const delivery = await Livraison.find(rating.ratingForId)
            if (delivery) itemName = `Livraison #${delivery.id}`
          }

          console.log("Reviewed : ", rating.reviewed.first_name)

          // Ajouter le nom et prénom de l'utilisateur reviewed
          const reviewedUserName = rating.reviewed 
            ? `${rating.reviewed.first_name} ${rating.reviewed.last_name}`
            : 'Utilisateur inconnu'

          return {
            ...rating.serialize(),
            itemName: itemName,
            reviewedUserName: reviewedUserName,
          }
        })
      )

      return response.ok(ratingsWithDetails)
    } catch (error) {
      console.error('Error fetching ratings:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch ratings',
        error: error.message,
      })
    }
  }

  /**
   * @tag Ratings - Admin
   * @summary Lister tous les ratings pour l'admin
   * @description Récupère tous les ratings avec les relations nécessaires.
   */
  async index({ response }: HttpContext) {
    try {
      const ratings = await Rating.query()
        .preload('reviewer') // Charge l'utilisateur qui a laissé l'avis
        .preload('reviewed') // Charge l'utilisateur qui a été noté
        .orderBy('created_at', 'desc')

      const ratingsWithDetails = await Promise.all(
        ratings.map(async (rating) => {
          let itemName = `Item #${rating.ratingForId}`
          if (rating.ratingType === 'service') {
            const service = await Service.find(rating.ratingForId)
            if (service) itemName = service.name
          } else if (rating.ratingType === 'delivery') {
            const delivery = await Livraison.find(rating.ratingForId)
            if (delivery) itemName = `Livraison #${delivery.id}`
          }

          // Ajouter le nom et prénom de l'utilisateur reviewed
          const reviewedUserName = rating.reviewed 
            ? `${rating.reviewed.first_name} ${rating.reviewed.last_name}`
            : 'Utilisateur inconnu'

          return {
            ...rating.serialize(),
            itemName: itemName,
            reviewedUserName: reviewedUserName,
          }
        })
      )

      return response.ok(ratingsWithDetails)
    } catch (error) {
      console.error('Error fetching ratings for admin:', error)
      return response.status(500).send({
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
        comment: data.comment,
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
      rating.adminResponseAt = DateTime.now()
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
   * @tag Ratings - Admin
   * @summary Ajoute une réponse admin à un avis
   */
  async addAdminResponse({ request, response }: HttpContext) {
    try {
      const rating = await Rating.findOrFail(request.param('id'))
      const { admin_response } = request.body()

      rating.adminResponse = admin_response
      rating.adminResponseAt = DateTime.now()
      await rating.save()

      return response.ok(rating)
    } catch (error) {
      return response.status(404).send({ error_message: 'Rating not found' })
    }
  }

  /**
   * @tag Ratings - Admin
   * @summary Bascule la visibilité d'un avis
   */
  async toggleVisibility({ request, response }: HttpContext) {
    try {
      const rating = await Rating.findOrFail(request.param('id'))
      rating.isVisible = !rating.isVisible
      await rating.save()

      return response.ok(rating)
    } catch (error) {
      return response.status(404).send({ error_message: 'Rating not found' })
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

      if (ratingType === 'service') {
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
        ratingDistribution,
      ] = await Promise.all([
        query.clone().count('* as total'),
        query.clone().avg('overall_rating as average'),
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
        },
        distribution: [],
      }
    }
  }
}
