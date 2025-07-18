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
      return response.status(500).send({
        error_message: 'Failed to fetch ratings',
        error: error.message,
      })
    }
  }


  async index({ response }: HttpContext) {
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
      return response.status(500).send({
        error_message: 'Failed to fetch ratings',
        error: error.message,
      })
    }
  }


  async create({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const data = await request.validateUsing(createRatingValidator)


      const canRate = await this.canUserRate(user.id, data.rating_type, data.rating_for_id)
      if (!canRate.allowed) {
        return response.forbidden({
          success: false,
          message: canRate.reason,
        })
      }


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


      const rating = await Rating.create({
        reviewerId: user.id,
        reviewedId: data.reviewed_id,
        ratingType: data.rating_type,
        ratingForId: data.rating_for_id,
        overallRating: data.overall_rating,
        comment: data.comment,
      })


      await this.updateAverageRating(data.reviewed_id, data.rating_type)

      return response.created({
        success: true,
        message: 'Évaluation créée avec succès',
        rating: rating.serialize(),
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: "Erreur lors de la création de l'évaluation",
        error: error.message,
      })
    }
  }


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


      const stats = await this.getRatingStats(userId, ratingType)

      return response.ok({
        success: true,
        ratings: ratings.serialize(),
        stats,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des évaluations',
      })
    }
  }


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
          reviewer_id: rating.reviewerId,
        })),
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des évaluations',
      })
    }
  }


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
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
      })
    }
  }


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
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la vérification',
      })
    }
  }


  async adminResponse({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const ratingId = request.param('ratingId')
      const { admin_response: adminResponse } = await request.validateUsing(
        adminRatingResponseValidator
      )


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
      return response.internalServerError({
        success: false,
        message: "Erreur lors de l'ajout de la réponse",
      })
    }
  }


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
        const livraison = await Livraison.query()
          .where('id', ratingForId)
          .where('client_id', userId)
          .where('status', 'completed')
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
      return {
        allowed: false,
        reason: 'Erreur lors de la vérification des droits',
      }
    }
  }


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
    }
  }


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
