import { HttpContext } from '@adonisjs/core/http'
import Livreur from '#models/livreur'
import Utilisateurs from '#models/utilisateurs'
import Ws from '#services/ws'
import db from '@adonisjs/lucid/services/db'

export default class DeliverySegmentController {
  /**
   * Récupérer les segments disponibles pour un livreur
   */
  public async getAvailableSegments({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { page = 1, limit = 10, max_distance, location } = request.qs()

      // Vérifier que l'utilisateur est un livreur
      const livreur = await Livreur.find(user.id)
      if (!livreur) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux livreurs',
        })
      }

      // Simulation de récupération des segments depuis la base de données
      const segments = await db
        .from('delivery_segments')
        .where('status', 'available')
        .where('estimated_distance', '<=', max_distance || 50)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)

      const availableSegments =
        segments.length > 0
          ? segments
          : [
              {
                id: 1,
                livraison_id: 1,
                order: 1,
                pickup_address: '123 Rue de la Paix, Paris',
                delivery_address: '456 Avenue des Champs, Paris',
                pickup_coordinates: { lat: 48.8566, lng: 2.3522 },
                delivery_coordinates: { lat: 48.8738, lng: 2.295 },
                distance: 5.2,
                estimated_duration: 15,
                estimated_cost: 13.0,
                status: 'available',
                created_at: new Date(),
                proposals_count: 0,
              },
            ]

      // Filtrer par distance si spécifié
      let filteredSegments = availableSegments
      if (max_distance && location) {
        filteredSegments = availableSegments.filter((segment) => {
          const distance = this.calculateDistance(
            location.lat,
            location.lng,
            segment.pickup_coordinates.lat,
            segment.pickup_coordinates.lng
          )
          return distance <= max_distance
        })
      }

      // Pagination simulée
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedSegments = filteredSegments.slice(startIndex, endIndex)

      return response.json({
        success: true,
        data: {
          segments: paginatedSegments,
          pagination: {
            page: page,
            limit: limit,
            total: filteredSegments.length,
            pages: Math.ceil(filteredSegments.length / limit),
          },
        },
      })
    } catch (error) {
      console.error('Error getting available segments:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des segments',
      })
    }
  }

  /**
   * Récupérer les propositions pour un segment
   */
  public async getSegmentProposals({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { segmentId } = params

      // Simulation de récupération des propositions
      const proposals = [
        {
          id: 1,
          segment_id: segmentId,
          livreur_id: 1,
          livreur: {
            id: 1,
            user: {
              nom: 'Dupont',
              prenom: 'Jean',
              photo_profil: null,
            },
            rating: 4.8,
            completed_deliveries: 156,
          },
          proposed_cost: 12.5,
          estimated_duration: 12,
          message: 'Je peux prendre ce segment rapidement',
          proposed_at: new Date(),
          status: 'pending',
        },
      ]

      return response.json({
        success: true,
        data: {
          segment_id: segmentId,
          proposals: proposals,
          total_proposals: proposals.length,
        },
      })
    } catch (error) {
      console.error('Error getting segment proposals:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des propositions',
      })
    }
  }

  /**
   * Proposer un segment
   */
  public async proposeSegment({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { segment_id, proposed_cost, estimated_duration, message } = request.only([
        'segment_id',
        'proposed_cost',
        'estimated_duration',
        'message',
      ])

      // Vérifier que l'utilisateur est un livreur
      const livreur = await Livreur.find(user.id)
      if (!livreur) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux livreurs',
        })
      }

      await livreur.load('user' as any)

      // Vérifier que le livreur est disponible
      if (livreur.availability_status !== 'available') {
        return response.status(400).json({
          success: false,
          message: 'Vous devez être disponible pour proposer un segment',
        })
      }

      // Créer la proposition (simulation)
      const proposal = {
        id: Date.now(),
        segment_id: segment_id,
        livreur_id: livreur.id,
        livreur: livreur.serialize(),
        proposed_cost: proposed_cost,
        estimated_duration: estimated_duration,
        message: message,
        proposed_at: new Date().toISOString(),
        status: 'pending',
      }

      // Notifier le client via WebSocket
      const ws = Ws.io
      ws.emit('segment_proposal', proposal)

      return response.status(201).json({
        success: true,
        data: proposal,
        message: 'Proposition envoyée avec succès',
      })
    } catch (error) {
      console.error('Error proposing segment:', error)
      return response.status(500).json({
        success: false,
        message: "Erreur lors de l'envoi de la proposition",
      })
    }
  }

  /**
   * Accepter une proposition de segment
   */
  public async acceptProposal({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { proposalId } = params
      const { segment_id } = request.only(['segment_id'])

      // Simulation de récupération de la proposition
      const proposal = {
        id: proposalId,
        segment_id: segment_id,
        livreur_id: 1,
        proposed_cost: 12.5,
        status: 'pending',
      }

      if (!proposal) {
        return response.status(404).json({
          success: false,
          message: 'Proposition introuvable',
        })
      }

      // Vérifier que l'utilisateur peut accepter cette proposition
      // (propriétaire de la livraison)

      // Accepter la proposition
      const acceptedProposal = {
        ...proposal,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      }

      // Charger les informations du livreur
      const livreur = await Livreur.find(proposal.livreur_id)
      await livreur?.load('user' as any)

      const acceptanceEvent = {
        segment_id: segment_id,
        livreur_id: proposal.livreur_id,
        livreur: livreur?.serialize(),
        client_id: user.id,
        accepted_at: new Date().toISOString(),
        proposal: acceptedProposal,
      }

      // Notifier via WebSocket
      const ws = Ws.io

      // Notifier le livreur accepté
      ws.to(`user_${proposal.livreur_id}`).emit('segment_accepted', acceptanceEvent)

      // Notifier que le segment n'est plus disponible
      ws.emit('segment_no_longer_available', { segment_id: segment_id })

      return response.json({
        success: true,
        data: acceptanceEvent,
        message: 'Proposition acceptée avec succès',
      })
    } catch (error) {
      console.error('Error accepting proposal:', error)
      return response.status(500).json({
        success: false,
        message: "Erreur lors de l'acceptation de la proposition",
      })
    }
  }

  /**
   * Rejeter une proposition de segment
   */
  public async rejectProposal({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { proposalId } = params

      // Simulation de récupération et mise à jour de la proposition
      const rejectedProposal = {
        id: proposalId,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
      }

      // Notifier le livreur via WebSocket
      const ws = Ws.io
      ws.emit('segment_proposal_rejected', rejectedProposal)

      return response.json({
        success: true,
        message: 'Proposition rejetée',
      })
    } catch (error) {
      console.error('Error rejecting proposal:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors du rejet de la proposition',
      })
    }
  }

  /**
   * Mettre à jour le statut d'un segment
   */
  public async updateStatus({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { segmentId } = params
      const { status, location, notes } = request.only(['status', 'location', 'notes'])

      // Vérifier que l'utilisateur est un livreur assigné à ce segment
      const livreur = await Livreur.find(user.id)
      if (!livreur) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux livreurs',
        })
      }

      // Valider le statut
      const validStatuses = ['picked_up', 'in_transit', 'delivered', 'failed']
      if (!validStatuses.includes(status)) {
        return response.status(400).json({
          success: false,
          message: 'Statut invalide',
        })
      }

      // Mettre à jour le segment (simulation)
      const updatedSegment = {
        id: segmentId,
        status: status,
        livreur_id: livreur.id,
        updated_at: new Date().toISOString(),
        location: location,
        notes: notes,
      }

      // Notifier via WebSocket
      const ws = Ws.io
      const statusUpdate = {
        segment_id: segmentId,
        status: status,
        livreur_id: livreur.id,
        updated_at: new Date().toISOString(),
        location: location,
        notes: notes,
      }

      ws.emit('segment_status_updated', statusUpdate)

      return response.json({
        success: true,
        data: updatedSegment,
        message: 'Statut mis à jour avec succès',
      })
    } catch (error) {
      console.error('Error updating segment status:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du statut',
      })
    }
  }

  /**
   * Récupérer l'historique d'un segment
   */
  public async getSegmentHistory({ params, response }: HttpContext) {
    try {
      const { segmentId } = params

      // Simulation de l'historique
      const history = [
        {
          id: 1,
          segment_id: segmentId,
          status: 'available',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          location: null,
          notes: 'Segment créé',
        },
        {
          id: 2,
          segment_id: segmentId,
          status: 'assigned',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          location: null,
          notes: 'Assigné au livreur Jean Dupont',
        },
        {
          id: 3,
          segment_id: segmentId,
          status: 'picked_up',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          location: { lat: 48.8566, lng: 2.3522 },
          notes: 'Colis récupéré',
        },
      ]

      return response.json({
        success: true,
        data: {
          segment_id: segmentId,
          history: history,
        },
      })
    } catch (error) {
      console.error('Error getting segment history:', error)
      return response.status(500).json({
        success: false,
        message: "Erreur lors de la récupération de l'historique",
      })
    }
  }

  /**
   * Récupérer les livreurs disponibles pour un segment
   */
  public async getAvailableLivreurs({ request, response }: HttpContext) {
    try {
      const { location, max_distance = 10 } = request.qs()

      let query = Livreur.query()
        .where('availability_status', 'available')
        .preload('user' as any)
        .orderBy('rating', 'desc')

      const livreurs = await query

      // Filtrer par distance si une localisation est fournie
      let filteredLivreurs = livreurs
      if (location) {
        filteredLivreurs = livreurs.filter((livreur) => {
          // Simulation de position du livreur
          const livreurLocation = { lat: 48.8566, lng: 2.3522 }
          const distance = this.calculateDistance(
            location.lat,
            location.lng,
            livreurLocation.lat,
            livreurLocation.lng
          )
          return distance <= max_distance
        })
      }

      const availableLivreurs = filteredLivreurs.map((livreur) => ({
        id: livreur.id,
        user: livreur.user,
        rating: livreur.rating,
        completed_deliveries: livreur.completed_deliveries || 0,
        availability_status: livreur.availability_status,
        current_location: { lat: 48.8566, lng: 2.3522 }, // Simulation
        distance: location
          ? this.calculateDistance(location.lat, location.lng, 48.8566, 2.3522)
          : null,
      }))

      return response.json({
        success: true,
        data: {
          livreurs: availableLivreurs,
          total: availableLivreurs.length,
        },
      })
    } catch (error) {
      console.error('Error getting available livreurs:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des livreurs',
      })
    }
  }

  /**
   * Calculer la distance entre deux points (formule haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance en km
    return d
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}
