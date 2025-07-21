import type { HttpContext } from '@adonisjs/core/http'
import Booking from '#models/booking'
import Service from '#models/service'
import Utilisateurs from '#models/utilisateurs'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { createBookingValidator } from '#validators/create_booking'

export default class BookingsController {
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
      return response.status(500).send({
        error_message: 'Failed to fetch bookings',
        error: error.message,
      })
    }
  }

  async create({ request, response, auth }: HttpContext) {
    try {
      const { client_id, service_id, start_datetime, end_datetime, address, notes } = await request.validateUsing(createBookingValidator)
      console.log("Address : ", address)

      const user = auth.user
      if (!user) {
        return response.status(401).send({
          error_message: 'Utilisateur non authentifié',
        })
      }

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

      const startDateTime = DateTime.fromISO(start_datetime.toString())
      const endDateTime = DateTime.fromISO(end_datetime.toString())

      if (!startDateTime.isValid || !endDateTime.isValid) {
        return response.status(400).send({
          error_message: 'Format de date invalide. Utilisez le format ISO 8601',
        })
      }

      if (startDateTime < DateTime.now()) {
        return response.status(400).send({
          error_message: 'La date de réservation ne peut pas être dans le passé',
        })
      }

      if (endDateTime <= startDateTime) {
        return response.status(400).send({
          error_message: 'La date de fin doit être postérieure à la date de début',
        })
      }

      const booking = await Booking.create({
        clientId: client_id,
        serviceId: service_id,
        startDatetime: startDateTime,
        endDatetime: endDateTime,
        address: address || 'Adresse à définir',
        notes: notes || null,
        status: 'pending',
        totalPrice: service.price,
      })

      return response.created({
        message: 'Réservation créée avec succès',
        booking: {
          id: booking.id,
          service_name: service.name,
          client_name: `${user.first_name} ${user.last_name}`,
          booking_datetime: booking.startDatetime.toISO(),
          end_datetime: booking.endDatetime.toISO(),
          address: booking.address,
          duration_hours: booking.getDurationInHours(),
          status: booking.status,
          notes: booking.notes,
          total_price: booking.totalPrice,
        },
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to create booking',
        error: error.message,
        error_object: error,
      })
    }
  }

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
          'utilisateurs.phone as client_phone',
          'services.name as service_name',
          'services.description as service_description',
          'services.price as service_price'
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

      const canUpdate = this.validateStatusTransition(booking.status, status)
      if (!canUpdate.allowed) {
        return response.status(400).send({
          error_message: canUpdate.reason,
        })
      }

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
        .orderBy('bookings.start_datetime', 'desc')

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

  async getUserBookings({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const status = request.input('status')

      let client = await db.from('clients').where('id', user.id).first()
      if (!client) {
        // Créer automatiquement un client si celui-ci n'existe pas
        const Client = (await import('#models/client')).default
        await Client.create({
          id: user.id,
          loyalty_points: 0,
          preferred_payment_method: null,
        })
        client = { id: user.id }
      }

      let query = db
        .from('bookings')
        .select(
          'bookings.*',
          'services.name as service_name',
          'services.description as service_description',
          'services.price'
        )
        .join('services', 'bookings.service_id', 'services.id')
        .where('bookings.client_id', client.id)
        .orderBy('bookings.start_datetime', 'desc')

      if (status) {
        query = query.where('bookings.status', status)
      }

      const rawBookings = await query

      const bookings = rawBookings.map((booking) => ({
        id: booking.id,
        service_name: booking.service_name,
        service_description: booking.service_description,
        price: booking.price,
        status: booking.status,
        date: booking.start_datetime
          ? new Date(booking.start_datetime).toISOString().split('T')[0]
          : null,
        time: booking.start_datetime
          ? new Date(booking.start_datetime).toTimeString().slice(0, 5)
          : null,
        notes: booking.notes,
        address: booking.address || 'Adresse non spécifiée',
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
      }))

      return response.ok({
        bookings: bookings,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch user bookings',
        error: error.message,
      })
    }
  }

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
        .orderBy('bookings.start_datetime', 'desc')

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

      const currentMonth = DateTime.now().startOf('month')
      const nextMonth = currentMonth.plus({ month: 1 })

      const monthlyRevenue = await db
        .from('bookings')
        .join('services', 'bookings.service_id', 'services.id')
        .where('bookings.status', 'completed')
        .whereBetween('bookings.start_datetime', [currentMonth.toSQL()!, nextMonth.toSQL()!])
        .sum('services.price as revenue')
        .first()

      const totalCount = totalBookings?.total || 0
      const pendingCount = pendingBookings?.total || 0
      const confirmedCount = confirmedBookings?.total || 0
      const completedCount = completedBookings?.total || 0
      const cancelledCount = cancelledBookings?.total || 0

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

          pending_percentage: pendingPercentage,
          confirmed_percentage: confirmedPercentage,
          completed_percentage: completedPercentage,
          cancelled_percentage: cancelledPercentage,
          completion_rate:
            totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0.0',
        },
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch booking stats',
        error: error.message,
      })
    }
  }

  async getAvailableSlots({ request, response }: HttpContext) {
    try {
      const serviceId = request.param('serviceId')
      const date = request.input('date') // Format: YYYY-MM-DD

      if (!date) {
        return response.status(400).send({
          error_message: 'Le paramètre date est requis (format: YYYY-MM-DD)',
        })
      }

      const service = await Service.findOrFail(serviceId)
      const targetDate = DateTime.fromISO(date)

      if (!targetDate.isValid) {
        return response.status(400).send({
          error_message: 'Format de date invalide. Utilisez YYYY-MM-DD',
        })
      }

      const existingBookings = await Booking.query()
        .where('service_id', serviceId)
        .where('status', '!=', 'cancelled')
        .whereBetween('start_datetime', [
          targetDate.startOf('day').toSQL(),
          targetDate.endOf('day').toSQL(),
        ])
        .orderBy('start_datetime', 'asc')

      const availableSlots = []
      const workingHours = {
        start: 9,
        end: 18,
        slotDuration: 2, // heures
      }

      for (
        let hour = workingHours.start;
        hour < workingHours.end;
        hour += workingHours.slotDuration
      ) {
        const slotStart = targetDate.set({ hour, minute: 0, second: 0 })
        const slotEnd = slotStart.plus({ hours: workingHours.slotDuration })

        const isAvailable = !existingBookings.some((booking) => {
          return (
            (booking.startDatetime <= slotStart && booking.endDatetime > slotStart) ||
            (booking.startDatetime < slotEnd && booking.endDatetime >= slotEnd) ||
            (booking.startDatetime >= slotStart && booking.endDatetime <= slotEnd)
          )
        })

        availableSlots.push({
          start_datetime: slotStart.toISO(),
          end_datetime: slotEnd.toISO(),
          available: isAvailable && slotStart > DateTime.now(),
        })
      }

      return response.ok({
        service: {
          id: service.id,
          title: service.name,
        },
        date: targetDate.toISODate(),
        available_slots: availableSlots,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch available slots',
      })
    }
  }

  async cancel({ request, response, auth }: HttpContext) {
    try {
      const id = request.param('id')
      const user = auth.user!

      // Récupérer la réservation avec les informations du service
      const booking = await db
        .from('bookings')
        .select(
          'bookings.*',
          'services.prestataireId'
        )
        .join('services', 'bookings.service_id', 'services.id')
        .where('bookings.id', id)
        .first()

      if (!booking) {
        return response.status(404).send({
          error_message: 'Réservation non trouvée',
        })
      }

      // Vérifier que l'utilisateur a le droit d'annuler cette réservation
      // Le client peut annuler sa propre réservation
      // Le prestataire peut annuler les réservations de ses services
      const isClient = booking.client_id === user.id
      const isProvider = booking.prestataireId === user.id

      if (!isClient && !isProvider) {
        return response.status(403).send({
          error_message: 'Vous n\'avez pas l\'autorisation d\'annuler cette réservation',
        })
      }

      // Vérifier que la réservation peut être annulée
      if (booking.status === 'cancelled') {
        return response.status(400).send({
          error_message: 'Cette réservation est déjà annulée',
        })
      }

      if (booking.status === 'completed') {
        return response.status(400).send({
          error_message: 'Impossible d\'annuler une réservation terminée',
        })
      }

      // Mettre à jour le statut à 'cancelled'
      await db
        .from('bookings')
        .where('id', id)
        .update({
          status: 'cancelled',
          updated_at: new Date(),
        })

      // Récupérer la réservation mise à jour
      const updatedBooking = await db
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
        .where('bookings.id', id)
        .first()

      return response.ok({
        message: 'Réservation annulée avec succès',
        booking: updatedBooking,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Erreur lors de l\'annulation de la réservation',
        error: error.message,
      })
    }
  }

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
