import type { HttpContext } from '@adonisjs/core/http'
import TrajetPlanifie from '#models/trajet_planifie'
import Livreur from '#models/livreur'
import { DateTime } from 'luxon'

export default class TrajetsPlanifiesController {
  /**
   * Créer un nouveau trajet planifié
   */
  async create({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      // Vérifier que l'utilisateur est un livreur
      const livreur = await Livreur.query().where('id', user.id).first()
      if (!livreur) {
        return response.status(403).json({ error: 'Accès refusé: vous devez être livreur' })
      }

      const {
        startingAddress,
        destinationAddress,
        plannedDate,
        description,
        type,
        maxCapacity,
        estimatedDuration,
      } = request.only([
        'startingAddress',
        'destinationAddress',
        'plannedDate',
        'description',
        'type',
        'maxCapacity',
        'estimatedDuration',
      ])

      // Validation des champs obligatoires
      if (!startingAddress || !destinationAddress || !plannedDate) {
        return response.status(400).json({
          error: 'Les champs startingAddress, destinationAddress et plannedDate sont obligatoires',
        })
      }

      // Vérifier que la date est dans le futur
      const plannedDateTime = DateTime.fromISO(plannedDate)
      if (plannedDateTime <= DateTime.now()) {
        return response.status(400).json({
          error: 'La date planifiée doit être dans le futur',
        })
      }

      const trajet = await TrajetPlanifie.create({
        livreurId: livreur.id,
        startingAddress,
        destinationAddress,
        plannedDate: plannedDateTime,
        description,
        type: type || 'delivery_route',
        maxCapacity,
        estimatedDuration,
        status: 'active',
      })

      await trajet.load('livreur')

      return response.status(201).json({
        message: 'Trajet planifié créé avec succès',
        trajet,
      })
    } catch (error) {
      console.error('Erreur lors de la création du trajet:', error)
      return response.status(500).json({ error: 'Erreur interne du serveur' })
    }
  }

  /**
   * Récupérer tous les trajets d'un livreur
   */
  async getByLivreur({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const livreurId = params.livreurId

      // Vérifier que l'utilisateur peut accéder à ces trajets
      if (user.id !== Number.parseInt(livreurId)) {
        const livreur = await Livreur.query().where('id', user.id).first()
        if (!livreur) {
          return response.status(403).json({ error: 'Accès refusé' })
        }
      }

      const trajets = await TrajetPlanifie.query()
        .where('livreurId', livreurId)
        .preload('livreur')
        .orderBy('plannedDate', 'asc')

      return response.json({ trajets })
    } catch (error) {
      console.error('Erreur lors de la récupération des trajets:', error)
      return response.status(500).json({ error: 'Erreur interne du serveur' })
    }
  }

  /**
   * Récupérer les trajets actifs (pour les clients qui cherchent des livreurs)
   */
  async getActive({ request, response }: HttpContext) {
    try {
      const { startingAddress, destinationAddress, date } = request.qs()

      let query = TrajetPlanifie.query()
        .where('status', 'active')
        .where('plannedDate', '>=', DateTime.now().toSQL())
        .preload('livreur')

      // Filtres optionnels
      if (startingAddress) {
        query = query.whereILike('startingAddress', `%${startingAddress}%`)
      }

      if (destinationAddress) {
        query = query.whereILike('destinationAddress', `%${destinationAddress}%`)
      }

      if (date) {
        const searchDate = DateTime.fromISO(date)
        query = query.whereBetween('plannedDate', [
          searchDate.startOf('day').toSQL(),
          searchDate.endOf('day').toSQL(),
        ])
      }

      const trajets = await query.orderBy('plannedDate', 'asc')

      return response.json({ trajets })
    } catch (error) {
      console.error('Erreur lors de la récupération des trajets actifs:', error)
      return response.status(500).json({ error: 'Erreur interne du serveur' })
    }
  }

  /**
   * Mettre à jour un trajet
   */
  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const trajetId = params.id

      const trajet = await TrajetPlanifie.find(trajetId)
      if (!trajet) {
        return response.status(404).json({ error: 'Trajet non trouvé' })
      }

      // Vérifier que l'utilisateur est le propriétaire du trajet
      const livreur = await Livreur.query().where('id', user.id).first()
      if (!livreur || trajet.livreurId !== livreur.id) {
        return response.status(403).json({ error: 'Accès refusé' })
      }

      const updateData = request.only([
        'startingAddress',
        'destinationAddress',
        'plannedDate',
        'description',
        'type',
        'maxCapacity',
        'estimatedDuration',
        'status',
      ])

      // Validation de la date si elle est modifiée
      if (updateData.plannedDate) {
        const plannedDateTime = DateTime.fromISO(updateData.plannedDate)
        if (plannedDateTime <= DateTime.now()) {
          return response.status(400).json({
            error: 'La date planifiée doit être dans le futur',
          })
        }
        updateData.plannedDate = plannedDateTime
      }

      trajet.merge(updateData)
      await trajet.save()
      await trajet.load('livreur')

      return response.json({
        message: 'Trajet mis à jour avec succès',
        trajet,
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du trajet:', error)
      return response.status(500).json({ error: 'Erreur interne du serveur' })
    }
  }

  /**
   * Supprimer un trajet
   */
  async delete({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const trajetId = params.id

      const trajet = await TrajetPlanifie.find(trajetId)
      if (!trajet) {
        return response.status(404).json({ error: 'Trajet non trouvé' })
      }

      // Vérifier que l'utilisateur est le propriétaire du trajet
      const livreur = await Livreur.query().where('id', user.id).first()
      if (!livreur || trajet.livreurId !== livreur.id) {
        return response.status(403).json({ error: 'Accès refusé' })
      }

      await trajet.delete()

      return response.json({ message: 'Trajet supprimé avec succès' })
    } catch (error) {
      console.error('Erreur lors de la suppression du trajet:', error)
      return response.status(500).json({ error: 'Erreur interne du serveur' })
    }
  }
}
