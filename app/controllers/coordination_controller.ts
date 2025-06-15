import type { HttpContext } from '@adonisjs/core/http'
import Livraison from '#models/livraison'
import Livreur from '#models/livreur'
import Client from '#models/client'
import Utilisateurs from '#models/utilisateurs'
import Ws from '#services/ws'
import db from '@adonisjs/lucid/services/db'

export default class CoordinationController {
  /**
   * Coordonner une livraison multi-segments
   */
  public async coordinateDelivery({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const {
        delivery_id,
        segments,
        optimization_type = 'time',
      } = request.only(['delivery_id', 'segments', 'optimization_type'])

      // Vérifier que l'utilisateur est un client
      const client = await Client.find(user.id)
      if (!client) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux clients',
        })
      }

      // Vérifier que la livraison existe et appartient au client
      const livraison = await Livraison.query()
        .where('id', delivery_id)
        .where('client_id', client.id)
        .first()

      if (!livraison) {
        return response.status(404).json({
          success: false,
          message: 'Livraison non trouvée',
        })
      }

      // Optimiser les segments selon le type demandé
      const optimizedSegments = await this.optimizeSegments(segments, optimization_type)

      // Assigner les livreurs aux segments optimisés
      const assignedSegments = await this.assignLivreursToSegments(optimizedSegments)

      // Créer le plan de coordination
      const coordinationPlan = {
        delivery_id: delivery_id,
        total_segments: assignedSegments.length,
        estimated_total_time: this.calculateTotalTime(assignedSegments),
        estimated_total_cost: this.calculateTotalCost(assignedSegments),
        segments: assignedSegments,
        optimization_type: optimization_type,
        created_at: new Date().toISOString(),
      }

      // Notifier tous les livreurs assignés via WebSocket
      const ws = Ws.io
      assignedSegments.forEach((segment) => {
        if (segment.assigned_livreur_id) {
          ws.to(`user_${segment.assigned_livreur_id}`).emit('segment_assigned', {
            segment_id: segment.id,
            delivery_id: delivery_id,
            pickup_location: segment.pickup_location,
            delivery_location: segment.delivery_location,
            estimated_duration: segment.estimated_duration,
            compensation: segment.compensation,
          })
        }
      })

      // Notifier le client du plan de coordination
      ws.to(`user_${client.id}`).emit('coordination_plan_created', coordinationPlan)

      return response.json({
        success: true,
        data: coordinationPlan,
        message: 'Plan de coordination créé avec succès',
      })
    } catch (error) {
      console.error('Error coordinating delivery:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la coordination de la livraison',
      })
    }
  }

  /**
   * Obtenir le statut de coordination d'une livraison
   */
  public async getCoordinationStatus({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { deliveryId } = params

      // Vérifier l'accès (client propriétaire ou livreur assigné)
      const livraison = await Livraison.find(deliveryId)
      if (!livraison) {
        return response.status(404).json({
          success: false,
          message: 'Livraison non trouvée',
        })
      }

      const client = await Client.find(user.id)
      const livreur = await Livreur.find(user.id)

      const hasAccess =
        (client && livraison.client_id === client.id) ||
        (livreur && (await this.isLivreurAssignedToDelivery(livreur.id, deliveryId)))

      if (!hasAccess) {
        return response.status(403).json({
          success: false,
          message: 'Accès non autorisé',
        })
      }

      // Simulation du statut de coordination
      const coordinationStatus = {
        delivery_id: deliveryId,
        status: 'in_progress',
        total_segments: 3,
        completed_segments: 1,
        active_segments: 2,
        estimated_completion: new Date(Date.now() + 3600000).toISOString(),
        segments: [
          {
            id: 1,
            status: 'completed',
            livreur_id: 1,
            pickup_location: { lat: 48.8566, lng: 2.3522, address: 'Paris Centre' },
            delivery_location: { lat: 48.8606, lng: 2.3376, address: 'Louvre' },
            completed_at: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 2,
            status: 'in_transit',
            livreur_id: 2,
            pickup_location: { lat: 48.8606, lng: 2.3376, address: 'Louvre' },
            delivery_location: { lat: 48.8738, lng: 2.295, address: 'Arc de Triomphe' },
            estimated_completion: new Date(Date.now() + 1800000).toISOString(),
          },
          {
            id: 3,
            status: 'pending',
            livreur_id: null,
            pickup_location: { lat: 48.8738, lng: 2.295, address: 'Arc de Triomphe' },
            delivery_location: { lat: 48.8584, lng: 2.2945, address: 'Tour Eiffel' },
            estimated_start: new Date(Date.now() + 1800000).toISOString(),
          },
        ],
      }

      return response.json({
        success: true,
        data: coordinationStatus,
      })
    } catch (error) {
      console.error('Error getting coordination status:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du statut',
      })
    }
  }

  /**
   * Réassigner un segment à un autre livreur
   */
  public async reassignSegment({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { segment_id, new_livreur_id, reason } = request.only([
        'segment_id',
        'new_livreur_id',
        'reason',
      ])

      // Vérifier que l'utilisateur est un client
      const client = await Client.find(user.id)
      if (!client) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux clients',
        })
      }

      // Vérifier que le nouveau livreur existe et est disponible
      const newLivreur = await Livreur.query()
        .where('id', new_livreur_id)
        .where('availability_status', 'available')
        .first()

      if (!newLivreur) {
        return response.status(404).json({
          success: false,
          message: 'Livreur non disponible',
        })
      }

      // Simulation de la réassignation
      const reassignment = {
        segment_id: segment_id,
        old_livreur_id: null, // À récupérer depuis la base
        new_livreur_id: new_livreur_id,
        reason: reason,
        reassigned_at: new Date().toISOString(),
        status: 'reassigned',
      }

      // Notifier les livreurs concernés via WebSocket
      const ws = Ws.io

      // Notifier le nouveau livreur
      ws.to(`user_${new_livreur_id}`).emit('segment_reassigned_to_you', {
        segment_id: segment_id,
        reason: reason,
        message: 'Un nouveau segment vous a été assigné',
      })

      // Notifier l'ancien livreur si applicable
      if (reassignment.old_livreur_id) {
        ws.to(`user_${reassignment.old_livreur_id}`).emit('segment_reassigned_from_you', {
          segment_id: segment_id,
          reason: reason,
          message: 'Un segment vous a été retiré',
        })
      }

      // Notifier le client
      ws.to(`user_${client.id}`).emit('segment_reassigned', reassignment)

      return response.json({
        success: true,
        data: reassignment,
        message: 'Segment réassigné avec succès',
      })
    } catch (error) {
      console.error('Error reassigning segment:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la réassignation',
      })
    }
  }

  /**
   * Optimiser l'ordre des segments
   */
  public async optimizeRoute({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { delivery_id, optimization_criteria = 'time' } = request.only([
        'delivery_id',
        'optimization_criteria',
      ])

      // Vérifier que l'utilisateur est un client
      const client = await Client.find(user.id)
      if (!client) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux clients',
        })
      }

      // Vérifier que la livraison appartient au client
      const livraison = await Livraison.query()
        .where('id', delivery_id)
        .where('client_id', client.id)
        .first()

      if (!livraison) {
        return response.status(404).json({
          success: false,
          message: 'Livraison non trouvée',
        })
      }

      // Simulation de l'optimisation de route
      const optimizedRoute = {
        delivery_id: delivery_id,
        optimization_criteria: optimization_criteria,
        original_route: [
          { segment_id: 1, order: 1, estimated_time: 30, estimated_cost: 15 },
          { segment_id: 2, order: 2, estimated_time: 45, estimated_cost: 20 },
          { segment_id: 3, order: 3, estimated_time: 25, estimated_cost: 12 },
        ],
        optimized_route: [
          { segment_id: 1, order: 1, estimated_time: 25, estimated_cost: 12 },
          { segment_id: 3, order: 2, estimated_time: 30, estimated_cost: 15 },
          { segment_id: 2, order: 3, estimated_time: 35, estimated_cost: 18 },
        ],
        savings: {
          time_saved: 15, // minutes
          cost_saved: 5, // euros
          efficiency_gain: '15%',
        },
        optimized_at: new Date().toISOString(),
      }

      // Notifier le client via WebSocket
      const ws = Ws.io
      ws.to(`user_${client.id}`).emit('route_optimized', optimizedRoute)

      return response.json({
        success: true,
        data: optimizedRoute,
        message: 'Route optimisée avec succès',
      })
    } catch (error) {
      console.error('Error optimizing route:', error)
      return response.status(500).json({
        success: false,
        message: "Erreur lors de l'optimisation de la route",
      })
    }
  }

  /**
   * Méthodes privées utilitaires
   */
  private async optimizeSegments(segments: any[], optimizationType: string) {
    // Simulation d'optimisation basée sur le type
    switch (optimizationType) {
      case 'time':
        return segments.sort((a, b) => a.estimated_duration - b.estimated_duration)
      case 'cost':
        return segments.sort((a, b) => a.estimated_cost - b.estimated_cost)
      case 'distance':
        return segments.sort((a, b) => a.distance - b.distance)
      default:
        return segments
    }
  }

  private async assignLivreursToSegments(segments: any[]) {
    // Simulation d'assignation de livreurs
    return segments.map((segment, index) => ({
      ...segment,
      assigned_livreur_id: index + 1,
      assignment_time: new Date().toISOString(),
      status: 'assigned',
    }))
  }

  private calculateTotalTime(segments: any[]): number {
    return segments.reduce((total, segment) => total + (segment.estimated_duration || 30), 0)
  }

  private calculateTotalCost(segments: any[]): number {
    return segments.reduce((total, segment) => total + (segment.estimated_cost || 15), 0)
  }

  private async isLivreurAssignedToDelivery(
    livreurId: number,
    deliveryId: string
  ): Promise<boolean> {
    // Simulation de vérification d'assignation
    // Dans un vrai projet, on vérifierait dans la table des segments
    return true
  }
}
