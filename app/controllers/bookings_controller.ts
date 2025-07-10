import type { HttpContext } from '@adonisjs/core/http'
import Booking from '#models/booking'
import Service from '#models/service'
import Utilisateurs from '#models/utilisateurs'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class BookingsController {
  /**
   * @tag Bookings - CRUD
   * @summary Lister tous les bookings
   * @description Récupère tous les bookings avec clients et services
   */
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const status = request.input('status')

      let query = Booking.query()
        .preload('client')
        .preload('service', (serviceQuery) => {
          serviceQuery.preload('prestataire').preload('serviceType')
        })

      if (status) {
        query = query.where('status', status)
      }

      const bookings = await query.orderBy('created_at', 'desc').paginate(page, limit)

      return response.ok(bookings.toJSON())
    } catch (error) {
      console.error('Error fetching bookings:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch bookings',
        error: error.message,
      })
    }
  }

  /**
   * @tag Bookings - CRUD
   * @summary Créer un nouveau booking
   * @description Crée un booking pour un client avec un service
   */
  async create({ request, response }: HttpContext) {
    try {
      const { client_id, service_id, booking_date, notes } = request.body()

      // Validation des données
      if (!client_id || !service_id || !booking_date) {
        return response.status(400).send({
          error_message: 'client_id, service_id et booking_date sont requis',
        })
      }

      // Vérifier que le client existe
      const client = await Utilisateurs.find(client_id)
      if (!client) {
        return response.status(404).send({
          error_message: 'Client non trouvé',
        })
      }

      // Vérifier que le service existe et est actif
      const service = await Service.find(service_id)
      if (!service) {
        return response.status(404).send({
          error_message: 'Service non trouvé',
        })
      }

      if (!service.isActive) {
        return response.status(400).send({
          error_message: "Ce service n'est plus disponible",
        })
      }

      // Convertir la date
      const bookingDateTime = DateTime.fromISO(booking_date)
      if (!bookingDateTime.isValid) {
        return response.status(400).send({
          error_message: 'Format de date invalide. Utilisez le format ISO 8601',
        })
      }

      // Vérifier que la date n'est pas dans le passé
      if (bookingDateTime < DateTime.now()) {
        return response.status(400).send({
          error_message: 'La date de réservation ne peut pas être dans le passé',
        })
      }

      // Créer le booking
      const booking = await Booking.create({
        clientId: client_id,
        serviceId: service_id,
        bookingDate: bookingDateTime,
        notes: notes || null,
        status: 'pending',
        totalPrice: service.price,
      })

      return response.created({
        message: 'Booking créé avec succès',
        booking: booking,
      })
    } catch (error) {
      console.error('Error creating booking:', error)
      return response.status(500).send({
        error_message: 'Failed to create booking',
        error: error.message,
      })
    }
  }

  /**
   * @tag Bookings - CRUD
   * @summary Récupérer un booking par ID
   * @description Affiche les détails d'un booking spécifique
   */
  async show({ request, response }: HttpContext) {
    try {
      const id = request.param('id')

      const booking = await db
        .from('bookings')
        .select(
          'bookings.*',
          'utilisateurs.first_name as client_first_name',
          'utilisateurs.last_name as client_last_name',
          'utilisateurs.email as client_email',
          'services.name as service_name',
          'services.description as service_description'
        )
        .join('utilisateurs', 'bookings.client_id', 'utilisateurs.id')
        .join('services', 'bookings.service_id', 'services.id')
        .where('bookings.id', id)
        .first()

      if (!booking) {
        return response.status(404).send({
          error_message: 'Booking non trouvé',
        })
      }

      return response.ok({
        booking: booking,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch booking',
        error: error.message,
      })
    }
  }

  /**
   * @tag Bookings - CRUD
   * @summary Mettre à jour le statut d'un booking
   * @description Met à jour le statut d'un booking (confirmed, completed, cancelled)
   */
  async updateStatus({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const { status, notes } = request.body()

      if (!status) {
        return response.status(400).send({
          error_message: 'Le statut est requis',
        })
      }

      const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return response.status(400).send({
          error_message: 'Statut invalide. Utilisez: ' + validStatuses.join(', '),
        })
      }

      const booking = await Booking.findOrFail(id)

      // Vérifier les transitions de statut autorisées
      const canUpdate = this.validateStatusTransition(booking.status, status)
      if (!canUpdate.allowed) {
        return response.status(400).send({
          error_message: canUpdate.reason,
        })
      }

      // Mettre à jour le booking
      booking.status = status
      if (notes) {
        booking.notes = notes
      }
      await booking.save()

      return response.ok({
        message: `Booking ${status} avec succès`,
        booking: booking,
      })
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({
          error_message: 'Booking non trouvé',
        })
      }
      return response.status(500).send({
        error_message: 'Failed to update booking status',
        error: error.message,
      })
    }
  }

  /**
   * @tag Bookings - Client
   * @summary Récupérer les bookings d'un client
   * @description Liste tous les bookings d'un client spécifique
   */
  async getClientBookings({ request, response }: HttpContext) {
    try {
      const clientId = request.param('clientId')
      const status = request.input('status')

      let query = db
        .from('bookings')
        .select(
          'bookings.*',
          'services.name as service_name',
          'services.description as service_description'
        )
        .join('services', 'bookings.service_id', 'services.id')
        .where('bookings.client_id', clientId)
        .orderBy('bookings.booking_date', 'desc')

      if (status) {
        query = query.where('bookings.status', status)
      }

      const bookings = await query

      return response.ok({
        bookings: bookings,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch client bookings',
        error: error.message,
      })
    }
  }

  /**
   * @tag Bookings - Prestataire
   * @summary Récupérer les bookings d'un prestataire
   * @description Liste tous les bookings pour les services d'un prestataire
   */
  async getProviderBookings({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('prestataireId')

      const bookings = await db
        .from('bookings')
        .select(
          'bookings.*',
          'services.name as service_name',
          'utilisateurs.first_name as client_first_name',
          'utilisateurs.last_name as client_last_name',
          'utilisateurs.email as client_email'
        )
        .join('services', 'bookings.service_id', 'services.id')
        .join('utilisateurs', 'bookings.client_id', 'utilisateurs.id')
        .where('services.prestataireId', prestataireId)
        .orderBy('bookings.booking_date', 'desc')

      return response.ok({
        bookings: bookings,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch provider bookings',
        error: error.message,
      })
    }
  }

  /**
   * @tag Bookings - Analytics
   * @summary Statistiques des bookings
   * @description Récupère les statistiques globales des bookings
   */
  async getBookingStats({ response }: HttpContext) {
    try {
      const totalBookings = await db.from('bookings').count('* as total').first()
      const pendingBookings = await db
        .from('bookings')
        .where('status', 'pending')
        .count('* as total')
        .first()
      const confirmedBookings = await db
        .from('bookings')
        .where('status', 'confirmed')
        .count('* as total')
        .first()
      const completedBookings = await db
        .from('bookings')
        .where('status', 'completed')
        .count('* as total')
        .first()
      const cancelledBookings = await db
        .from('bookings')
        .where('status', 'cancelled')
        .count('* as total')
        .first()

      // Revenus du mois en cours - Calculer à partir des prix des services
      const currentMonth = DateTime.now().startOf('month')
      const nextMonth = currentMonth.plus({ month: 1 })

      // Utiliser un join avec la table services pour récupérer les prix
      const monthlyRevenue = await db
        .from('bookings')
        .join('services', 'bookings.service_id', 'services.id')
        .where('bookings.status', 'completed')
        .whereBetween('bookings.booking_date', [currentMonth.toSQL()!, nextMonth.toSQL()!])
        .sum('services.price as revenue')
        .first()

      // Calculer la moyenne des réservations par type de statut
      const totalCount = totalBookings?.total || 0
      const pendingCount = pendingBookings?.total || 0
      const confirmedCount = confirmedBookings?.total || 0
      const completedCount = completedBookings?.total || 0
      const cancelledCount = cancelledBookings?.total || 0

      // Calcul des pourcentages
      const pendingPercentage =
        totalCount > 0 ? ((pendingCount / totalCount) * 100).toFixed(1) : '0.0'
      const confirmedPercentage =
        totalCount > 0 ? ((confirmedCount / totalCount) * 100).toFixed(1) : '0.0'
      const completedPercentage =
        totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0.0'
      const cancelledPercentage =
        totalCount > 0 ? ((cancelledCount / totalCount) * 100).toFixed(1) : '0.0'

      return response.ok({
        stats: {
          total: totalCount,
          pending: pendingCount,
          confirmed: confirmedCount,
          completed: completedCount,
          cancelled: cancelledCount,
          monthly_revenue: monthlyRevenue?.revenue || 0,
          // Ajout des pourcentages pour corriger l'affichage 0.0%
          pending_percentage: pendingPercentage,
          confirmed_percentage: confirmedPercentage,
          completed_percentage: completedPercentage,
          cancelled_percentage: cancelledPercentage,
          completion_rate:
            totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0.0',
        },
      })
    } catch (error) {
      console.error('Booking stats error:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch booking stats',
        error: error.message,
      })
    }
  }

  /**
   * Valide les transitions de statut
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): { allowed: boolean; reason?: string } {
    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    if (transitions[currentStatus]?.includes(newStatus)) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Transition de ${currentStatus} vers ${newStatus} non autorisée`,
    }
  }
}
