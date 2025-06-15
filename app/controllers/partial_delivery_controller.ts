import type { HttpContext } from '@adonisjs/core/http'
import Livraison from '#models/livraison'
import Livreur from '#models/livreur'
import Client from '#models/client'
import Ws from '#services/ws'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class PartialDeliveryController {
  /**
   * Récupérer toutes les livraisons partielles
   */
  async index({ request, response }: HttpContext) {
    try {
      const { status, page = 1, limit = 10 } = request.qs()

      let query = Livraison.query()
        .where('is_partial', true)
        .preload('client', (clientQuery) => {
          clientQuery.preload('user')
        })
        .preload('livreur', (livreurQuery) => {
          livreurQuery.preload('user')
        })
        .orderBy('created_at', 'desc')

      if (status) {
        query = query.where('status', status)
      }

      const partialDeliveries = await query.paginate(page, limit)

      return response.json({
        success: true,
        data: partialDeliveries.all(),
        meta: {
          total: partialDeliveries.total,
          page: partialDeliveries.currentPage,
          limit: partialDeliveries.perPage,
          lastPage: partialDeliveries.lastPage,
        },
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des livraisons partielles:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des livraisons partielles',
      })
    }
  }

  /**
   * Créer une nouvelle livraison partielle
   */
  async create({ request, response, auth }: HttpContext) {
    const trx = await db.transaction()

    try {
      const user = auth.user!
      const { livraison_id, segments } = request.only(['livraison_id', 'segments'])

      // Vérifier que l'utilisateur est un client
      const client = await Client.find(user.id)
      if (!client) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux clients',
        })
      }

      // Récupérer la livraison originale
      const originalLivraison = await Livraison.findOrFail(livraison_id)

      // Vérifier que le client est propriétaire de la livraison
      if (originalLivraison.clientId !== client.id) {
        return response.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à modifier cette livraison",
        })
      }

      // Marquer la livraison originale comme partielle
      await originalLivraison
        .merge({
          isPartial: true,
          status: 'partial_requested',
        })
        .save()

      // Créer les segments (simulation - dans un vrai projet, on aurait une table segments)
      const createdSegments = segments.map((segment: any, index: number) => ({
        id: Date.now() + index,
        livraison_id: originalLivraison.id,
        order: index + 1,
        pickup_address: segment.pickup_address,
        delivery_address: segment.delivery_address,
        pickup_coordinates: segment.pickup_coordinates,
        delivery_coordinates: segment.delivery_coordinates,
        distance: segment.distance,
        estimated_duration: segment.estimated_duration,
        estimated_cost: segment.estimated_cost,
        status: 'available',
        created_at: DateTime.now().toISO(),
      }))

      await trx.commit()

      // Notifier les livreurs disponibles via WebSocket
      const availableLivreurs = await Livreur.query()
        .where('disponible', true)
        .where('status', 'available')

      for (const livreur of availableLivreurs) {
        Ws.io?.to(`user_${livreur.id}`).emit('partial_delivery_request', {
          livraison_id: originalLivraison.id,
          segments: createdSegments,
          client_info: {
            id: client.id,
            nom: user.nom,
            prenom: user.prenom,
          },
        })
      }

      return response.created({
        success: true,
        message: 'Livraison partielle créée avec succès',
        data: {
          livraison: originalLivraison,
          segments: createdSegments,
        },
      })
    } catch (error) {
      await trx.rollback()
      console.error('Erreur lors de la création de la livraison partielle:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la livraison partielle',
        error: error.message,
      })
    }
  }

  /**
   * Afficher une livraison partielle
   */
  async show({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const livraison = await Livraison.findOrFail(id)

      // Vérifier les permissions
      const client = await Client.find(user.id)
      const livreur = await Livreur.find(user.id)

      if (!client && !livreur) {
        return response.status(403).json({
          success: false,
          message: 'Accès non autorisé',
        })
      }

      if (client && livraison.clientId !== client.id) {
        return response.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à voir cette livraison",
        })
      }

      // Simulation des segments
      const segments = [
        {
          id: 1,
          livraison_id: livraison.id,
          order: 1,
          pickup_address: livraison.pickupLocation,
          delivery_address: livraison.dropoffLocation,
          status: 'available',
          livreur_id: null,
        },
      ]

      return response.ok({
        success: true,
        data: {
          livraison,
          segments,
        },
      })
    } catch (error) {
      console.error('Erreur lors de la récupération de la livraison:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la livraison',
        error: error.message,
      })
    }
  }

  /**
   * Récupérer les livraisons partielles d'un utilisateur
   */
  async getUserDeliveries({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { userId } = params
      const { page = 1, limit = 10, status } = request.qs()

      // Vérifier que l'utilisateur peut accéder à ces données
      if (user.id !== Number.parseInt(userId)) {
        return response.status(403).json({
          success: false,
          message: 'Accès non autorisé',
        })
      }

      let query = Livraison.query()
        .where('client_id', userId)
        .where('is_partial', true)
        .orderBy('created_at', 'desc')

      if (status) {
        query = query.where('status', status)
      }

      const livraisons = await query.paginate(page, limit)

      return response.ok({
        success: true,
        data: livraisons,
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des livraisons:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des livraisons',
        error: error.message,
      })
    }
  }

  /**
   * Annuler une livraison partielle
   */
  async cancel({ params, response, auth }: HttpContext) {
    const trx = await db.transaction()

    try {
      const user = auth.user!
      const { id } = params

      const client = await Client.find(user.id)
      if (!client) {
        return response.status(403).json({
          success: false,
          message: 'Accès réservé aux clients',
        })
      }

      const livraison = await Livraison.findOrFail(id)

      if (livraison.clientId !== client.id) {
        return response.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à annuler cette livraison",
        })
      }

      if (!['partial_requested', 'segments_proposed'].includes(livraison.status)) {
        return response.status(400).json({
          success: false,
          message: 'Cette livraison ne peut plus être annulée',
        })
      }

      await livraison
        .merge({
          status: 'cancelled',
          isPartial: false,
        })
        .save()

      await trx.commit()

      // Notifier via WebSocket
      Ws.io?.emit('partial_delivery_cancelled', {
        livraison_id: livraison.id,
        client_id: client.id,
      })

      return response.ok({
        success: true,
        message: 'Livraison partielle annulée avec succès',
      })
    } catch (error) {
      await trx.rollback()
      console.error("Erreur lors de l'annulation:", error)
      return response.status(500).json({
        success: false,
        message: "Erreur lors de l'annulation de la livraison",
        error: error.message,
      })
    }
  }

  /**
   * Calculer le coût d'une livraison partielle
   */
  async calculateCost({ request, response }: HttpContext) {
    try {
      const { segments } = request.only(['segments'])

      let totalCost = 0
      const baseCostPerKm = 2.5
      const coordinationFee = 5.0

      for (const segment of segments) {
        const segmentCost = segment.distance * baseCostPerKm
        totalCost += segmentCost
      }

      // Ajouter les frais de coordination si plus d'un segment
      if (segments.length > 1) {
        totalCost += coordinationFee * (segments.length - 1)
      }

      return response.ok({
        success: true,
        data: {
          total_cost: Math.round(totalCost * 100) / 100,
          base_cost_per_km: baseCostPerKm,
          coordination_fee: coordinationFee,
          segments_count: segments.length,
        },
      })
    } catch (error) {
      console.error('Erreur lors du calcul du coût:', error)
      return response.status(500).json({
        success: false,
        message: 'Erreur lors du calcul du coût',
        error: error.message,
      })
    }
  }

  /**
   * Optimiser l'itinéraire des segments
   */
  async optimizeRoute({ request, response }: HttpContext) {
    try {
      const { segments } = request.only(['segments'])

      // Algorithme simple d'optimisation (plus proche voisin)
      const optimizedSegments = this.optimizeSegmentOrder(segments)

      return response.ok({
        success: true,
        data: {
          original_segments: segments,
          optimized_segments: optimizedSegments,
          optimization_applied: true,
        },
      })
    } catch (error) {
      console.error("Erreur lors de l'optimisation:", error)
      return response.status(500).json({
        success: false,
        message: "Erreur lors de l'optimisation de l'itinéraire",
        error: error.message,
      })
    }
  }

  /**
   * Optimiser l'ordre des segments (algorithme simple)
   */
  private optimizeSegmentOrder(segments: any[]) {
    if (segments.length <= 1) return segments

    const optimized = [...segments]

    // Tri simple par distance (du plus proche au plus loin)
    optimized.sort((a, b) => a.distance - b.distance)

    // Réassigner les ordres
    optimized.forEach((segment, index) => {
      segment.order = index + 1
    })

    return optimized
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
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
    return R * c
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}
