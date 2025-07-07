import type { HttpContext } from '@adonisjs/core/http'
import Prestataire from '#models/prestataire'
import Utilisateurs from '#models/utilisateurs'
import { prestataireValidator } from '#validators/add_prestataire'
import Rating from '#models/rating'
import Service from '#models/service'

export default class PrestatairesController {
  /**
   * Liste tous les prestataires
   */
  async index({ response }: HttpContext) {
    try {
      const prestataires = await Prestataire.query().orderBy('created_at', 'desc')

      // Charger les utilisateurs séparément
      const userIds = prestataires.map((p) => p.id)
      const users = await Utilisateurs.query()
        .whereIn('id', userIds)
        .select('id', 'first_name', 'last_name', 'email', 'city')
      const usersMap = new Map(users.map((u) => [u.id, u]))

      return response.ok({
        prestataires: prestataires.map((prestataire) => ({
          ...prestataire.serialize(),
          user: usersMap.get(prestataire.id) || null,
        })),
      })
    } catch (error) {
      console.error('Failed to fetch prestataires:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch prestataires',
        error: error.message,
      })
    }
  }

  async add({ request, response }: HttpContext) {
    try {
      const { utilisateur_id } = await request.validateUsing(prestataireValidator)

      // Vérifier si l'utilisateur existe
      const user = await Utilisateurs.find(utilisateur_id)
      if (!user) {
        return response.notFound({ message: 'User not found' })
      }

      const prestataireAlreadyLinked = await Prestataire.findBy('id', utilisateur_id)
      if (prestataireAlreadyLinked) {
        return response.badRequest({ message: 'User already has a Prestataire account' })
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
      console.error('Failed to create prestataire:', error)
      return response.badRequest({
        message: 'Invalid data',
        error: error.message,
      })
    }
  }

  async getProfile({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      if (!id) {
        return response.badRequest({ message: 'ID is required' })
      }

      const prestataire = await Prestataire.findOrFail(id)
      const user = await Utilisateurs.findOrFail(id)

      const { password: _, ...userData } = user.serialize()
      const { id: __, ...prestataireData } = prestataire.serialize()

      return response.ok({
        user: userData,
        prestataire: prestataireData,
      })
    } catch (error) {
      console.error('Failed to fetch prestataire profile:', error)
      return response.notFound({
        message: 'Prestataire Profile not found',
        error: error.message,
      })
    }
  }

  async updateProfile({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      if (!id) {
        return response.badRequest({ message: 'ID is required' })
      }

      const prestataire = await Prestataire.findOrFail(id)
      const updateData = request.only([
        'service_type',
        'rating',
        'availability',
        'description',
        'experience_years',
        'certifications',
      ])

      prestataire.merge(updateData)
      await prestataire.save()

      const { id: _, ...prestataireData } = prestataire.serialize()
      return response.ok(prestataireData)
    } catch (error) {
      console.error('Failed to update prestataire profile:', error)
      return response.badRequest({
        message: 'Failed to update profile',
        error: error.message,
      })
    }
  }

  /**
   * Récupère les avis d'un prestataire
   */
  async getReviews({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('id')
      if (!prestataireId) {
        return response.badRequest({ message: 'Prestataire ID is required' })
      }

      const ratings = await Rating.query()
        .where('reviewed_id', prestataireId)
        .where('rating_type', 'service')
        .where('is_visible', true)
        .orderBy('created_at', 'desc')

      // Charger les reviewers séparément
      const reviewerIds = ratings.map((r) => r.reviewer_id)
      const reviewers = await Utilisateurs.query()
        .whereIn('id', reviewerIds)
        .select('id', 'first_name', 'last_name')
      const reviewersMap = new Map(reviewers.map((r) => [r.id, r]))

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
              console.error(`Failed to fetch service name for rating ${rating.id}:`, error)
              // Ignorer l'erreur, garder le nom par défaut
            }
          }

          const reviewer = reviewersMap.get(rating.reviewer_id)
          return {
            id: rating.id,
            client_name: reviewer
              ? `${reviewer.first_name} ${reviewer.last_name}`
              : 'Client anonyme',
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

      // Calculer la note moyenne avec une précision de 1 décimale
      const averageRating =
        reviews.length > 0
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
          : null

      return response.ok({
        reviews,
        total: reviews.length,
        average_rating: averageRating,
      })
    } catch (error) {
      console.error('Failed to fetch prestataire reviews:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch reviews',
        error: error.message,
      })
    }
  }
}
