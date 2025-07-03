import type { HttpContext } from '@adonisjs/core/http'
import Prestataire from '#models/prestataire'
import Utilisateurs from '#models/utilisateurs'
import { prestataireValidator } from '#validators/add_prestataire'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
export default class PrestatairesController {
  /**
   * Liste tous les prestataires
   */
  async index({ response }: HttpContext) {
    try {
      const prestataires = await Prestataire.query()
        .preload('user' as ExtractModelRelations<Prestataire>)
        .orderBy('created_at', 'desc')

      return response.ok({
        prestataires: prestataires.map((prestataire) => ({
          ...prestataire.serialize(),
          user: prestataire.user
            ? {
                ...prestataire.user.serialize(),
                password: undefined, // Remove password from response
              }
            : null,
        })),
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch prestataires',
        error: error.message,
      })
    }
  }

  async add({ request, response }: HttpContext) {
    try {
      const { utilisateur_id } = await request.validateUsing(prestataireValidator)

      const prestataireAlreadyLinked = await Prestataire.findBy('id', utilisateur_id)
      if (prestataireAlreadyLinked) {
        return response.badRequest({ message: 'Utilisateurs already has a Prestataire account' })
      }

      const prestataire = await Prestataire.create({
        id: utilisateur_id,
        rating: null,
      })

      return response.created({
        message: 'Prestataire created successfully',
        prestataire: prestataire.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Invalid data', error_code: error })
    }
  }

  async getProfile({ request, response }: HttpContext) {
    try {
      const prestataire = await Prestataire.findOrFail(request.param('id'))
      const user = await Utilisateurs.findOrFail(request.param('id'))
      const { password: _, ...userData } = user.serialize()
      const { id: __, ...prestataireData } = prestataire.serialize()
      return response.ok({ user: userData, prestataire: prestataireData })
    } catch (error) {
      return response.notFound({ message: 'Prestataire Profile not found', error_code: error })
    }
  }

  async updateProfile({ request, response }: HttpContext) {
    try {
      const prestataire = await Prestataire.findOrFail(request.param('id'))
      prestataire.merge(request.body())
      await prestataire.save()
      const { password: _, ...prestataireData } = prestataire.serialize()
      return response.ok(prestataireData)
    } catch (error) {
      return response.badRequest({ message: 'Wrong Parametters', error_code: error })
    }
  }

  /**
   * Récupère les avis d'un prestataire
   */
  async getReviews({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('id')
      const Rating = (await import('#models/rating')).default
      const Utilisateurs = (await import('#models/utilisateurs')).default
      const Service = (await import('#models/service')).default

      const ratings = await Rating.query()
        .where('reviewed_id', prestataireId)
        .where('rating_type', 'service')
        .where('is_visible', true)
        .preload('reviewer')
        .orderBy('created_at', 'desc')

      // Transformer les données pour le frontend
      const reviews = await Promise.all(
        ratings.map(async (rating) => {
          let serviceName = 'Service générique'

          // Essayer de récupérer le nom du service si possible
          if (rating.rating_for_id < 999) {
            // Les avis génériques ont un ID >= 999
            try {
              const service = await Service.find(rating.rating_for_id)
              if (service) {
                serviceName = service.name
              }
            } catch (error) {
              // Ignorer l'erreur, garder le nom par défaut
            }
          }

          return {
            id: rating.id,
            client_name: `${rating.reviewer.first_name} ${rating.reviewer.last_name}`,
            rating: rating.overall_rating,
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

      return response.ok({
        reviews,
        total: reviews.length,
        average_rating:
          reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : null,
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch reviews',
        error: error.message,
      })
    }
  }
}
