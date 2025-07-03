import type { HttpContext } from '@adonisjs/core/http'
import Rating from '#models/rating'
import Prestataire from '#models/prestataire'
import Service from '#models/service'
import Booking from '#models/booking'

export default class RatingController {
  /**
   * Créer un nouvel avis
   */
  async create({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const {
        reviewed_id,
        rating_type,
        rating_for_id,
        overall_rating,
        punctuality_rating,
        quality_rating,
        communication_rating,
        value_rating,
        comment,
      } = request.only([
        'reviewed_id',
        'rating_type',
        'rating_for_id',
        'overall_rating',
        'punctuality_rating',
        'quality_rating',
        'communication_rating',
        'value_rating',
        'comment',
      ])

      // Vérifier si l'utilisateur a déjà noté ce service/prestataire
      const existingRating = await Rating.query()
        .where('reviewer_id', user.id)
        .where('rating_type', rating_type)
        .where('rating_for_id', rating_for_id)
        .first()

      if (existingRating) {
        return response.badRequest({
          message: 'Vous avez déjà évalué ce service',
        })
      }

      // Si c'est un avis pour un service, vérifier que l'utilisateur a bien réservé ce service
      if (rating_type === 'service') {
        const booking = await Booking.query()
          .where('client_id', user.id)
          .where('service_id', rating_for_id)
          .where('status', 'completed')
          .first()

        if (!booking) {
          return response.badRequest({
            message: 'Vous ne pouvez évaluer que les services que vous avez utilisés',
          })
        }
      }

      const rating = await Rating.create({
        reviewer_id: user.id,
        reviewed_id,
        rating_type,
        rating_for_id,
        overall_rating,
        punctuality_rating,
        quality_rating,
        communication_rating,
        value_rating,
        comment,
        is_verified_purchase: true,
        is_visible: true,
      })

      // Mettre à jour la note moyenne du prestataire
      await this.updatePrestataireRating(reviewed_id)

      return response.created({
        message: 'Avis créé avec succès',
        rating: rating.serialize(),
      })
    } catch (error) {
      console.error('Erreur création avis:', error)
      return response.status(500).json({
        error_message: "Erreur lors de la création de l'avis",
        error: error.message,
      })
    }
  }

  /**
   * Récupérer les avis d'un prestataire
   */
  async getByPrestataire({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('prestataireId')

      const ratings = await Rating.query()
        .where('reviewed_id', prestataireId)
        .where('rating_type', 'service')
        .where('is_visible', true)
        .preload('reviewer')
        .orderBy('created_at', 'desc')

      const reviews = await Promise.all(
        ratings.map(async (rating) => {
          let serviceName = 'Service générique'

          try {
            const service = await Service.find(rating.rating_for_id)
            if (service) {
              serviceName = service.name
            }
          } catch {
            // Garder le nom par défaut
          }

          return {
            id: rating.id,
            client_name: `${rating.reviewer.first_name} ${rating.reviewer.last_name}`,
            overall_rating: rating.overall_rating,
            punctuality_rating: rating.punctuality_rating,
            quality_rating: rating.quality_rating,
            communication_rating: rating.communication_rating,
            value_rating: rating.value_rating,
            comment: rating.comment,
            service_name: serviceName,
            is_verified_purchase: rating.is_verified_purchase,
            created_at: rating.createdAt.toFormat('yyyy-MM-dd HH:mm:ss'),
          }
        })
      )

      let averageRating = null
      if (reviews.length > 0) {
        const validRatings = reviews
          .map((r) =>
            typeof r.overall_rating === 'string' ? parseFloat(r.overall_rating) : r.overall_rating
          )
          .filter((r) => !isNaN(r))

        if (validRatings.length > 0) {
          const sum = validRatings.reduce((total, rating) => total + rating, 0)
          averageRating = Math.round((sum / validRatings.length) * 10) / 10
        }
      }

      return response.ok({
        reviews,
        total: reviews.length,
        average_rating: averageRating,
      })
    } catch (error) {
      console.error('Erreur récupération avis:', error)
      return response.status(500).json({
        error_message: 'Erreur lors de la récupération des avis',
        error: error.message,
      })
    }
  }

  /**
   * Récupérer les avis d'un service spécifique
   */
  async getByService({ request, response }: HttpContext) {
    try {
      const serviceId = request.param('serviceId')

      const ratings = await Rating.query()
        .where('rating_for_id', serviceId)
        .where('rating_type', 'service')
        .where('is_visible', true)
        .preload('reviewer')
        .orderBy('created_at', 'desc')

      const reviews = ratings.map((rating) => ({
        id: rating.id,
        client_name: `${rating.reviewer.first_name} ${rating.reviewer.last_name}`,
        overall_rating: rating.overall_rating,
        punctuality_rating: rating.punctuality_rating,
        quality_rating: rating.quality_rating,
        communication_rating: rating.communication_rating,
        value_rating: rating.value_rating,
        comment: rating.comment,
        is_verified_purchase: rating.is_verified_purchase,
        created_at: rating.createdAt.toFormat('yyyy-MM-dd HH:mm:ss'),
      }))

      let averageRating = null
      if (reviews.length > 0) {
        const validRatings = reviews
          .map((r) =>
            typeof r.overall_rating === 'string' ? parseFloat(r.overall_rating) : r.overall_rating
          )
          .filter((r) => !isNaN(r))

        if (validRatings.length > 0) {
          const sum = validRatings.reduce((total, rating) => total + rating, 0)
          averageRating = Math.round((sum / validRatings.length) * 10) / 10
        }
      }

      return response.ok({
        reviews,
        total: reviews.length,
        average_rating: averageRating,
      })
    } catch (error) {
      console.error('Erreur récupération avis service:', error)
      return response.status(500).json({
        error_message: 'Erreur lors de la récupération des avis du service',
        error: error.message,
      })
    }
  }

  /**
   * Mettre à jour un avis (modération admin)
   */
  async update({ request, response, auth }: HttpContext) {
    try {
      const ratingId = request.param('id')
      const { is_visible, admin_response } = request.only(['is_visible', 'admin_response'])

      const rating = await Rating.findOrFail(ratingId)

      rating.merge({
        is_visible,
        admin_response,
        admin_response_at: admin_response ? new Date() : null,
      })

      await rating.save()

      // Recalculer la note moyenne du prestataire si la visibilité a changé
      if (request.input('is_visible') !== undefined) {
        await this.updatePrestataireRating(rating.reviewed_id)
      }

      return response.ok({
        message: 'Avis mis à jour avec succès',
        rating: rating.serialize(),
      })
    } catch (error) {
      console.error('Erreur mise à jour avis:', error)
      return response.status(500).json({
        error_message: "Erreur lors de la mise à jour de l'avis",
        error: error.message,
      })
    }
  }

  /**
   * Supprimer un avis
   */
  async delete({ request, response, auth }: HttpContext) {
    try {
      const ratingId = request.param('id')
      const user = await auth.getUserOrFail()

      const rating = await Rating.findOrFail(ratingId)

      // Vérifier que l'utilisateur peut supprimer cet avis (auteur ou admin)
      if (rating.reviewer_id !== user.id && user.role !== 'admin') {
        return response.forbidden({
          message: "Vous n'avez pas l'autorisation de supprimer cet avis",
        })
      }

      const reviewedId = rating.reviewed_id
      await rating.delete()

      // Recalculer la note moyenne du prestataire
      await this.updatePrestataireRating(reviewedId)

      return response.ok({
        message: 'Avis supprimé avec succès',
      })
    } catch (error) {
      console.error('Erreur suppression avis:', error)
      return response.status(500).json({
        error_message: "Erreur lors de la suppression de l'avis",
        error: error.message,
      })
    }
  }

  /**
   * Récupérer tous les avis (admin)
   */
  async getAllForAdmin({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const status = request.input('status') // 'visible', 'hidden', 'all'

      let query = Rating.query()
        .preload('reviewer')
        .preload('reviewed')
        .orderBy('created_at', 'desc')

      if (status === 'visible') {
        query = query.where('is_visible', true)
      } else if (status === 'hidden') {
        query = query.where('is_visible', false)
      }

      const ratings = await query.paginate(page, limit)

      return response.ok(ratings)
    } catch (error) {
      console.error('Erreur récupération avis admin:', error)
      return response.status(500).json({
        error_message: 'Erreur lors de la récupération des avis',
        error: error.message,
      })
    }
  }

  /**
   * Mettre à jour la note moyenne d'un prestataire
   */
  private async updatePrestataireRating(prestataireId: number) {
    try {
      const prestataire = await Prestataire.findOrFail(prestataireId)
      await prestataire.updateRating()
    } catch (error) {
      console.error('Erreur mise à jour note prestataire:', error)
    }
  }
}
