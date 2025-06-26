import type { HttpContext } from '@adonisjs/core/http'
import Service from '#models/service'
import Prestataire from '#models/prestataire'
import ServiceType from '#models/service_type'
import { DateTime } from 'luxon'
import { serviceValidator } from '#validators/create_service'
import db from '@adonisjs/lucid/services/db'

export default class ServicesController {
  /**
   * @tag Services - CRUD
   * @summary Lister tous les services
   * @description Récupère la liste de tous les services avec prestataires et types
   */
  async index({ response }: HttpContext) {
    try {
      const services = await Service.query()
        .preload('prestataire', (prestataireQuery) => {
          prestataireQuery.preload('user')
        })
        .orderBy('name', 'asc')

      return response.ok({
        services: services.map((service) => ({
          ...service.serialize(),
          prestataireNme:
            service.prestataire?.user?.first_name + ' ' + service.prestataire?.user?.last_name,
          prestataireEmail: service.prestataire?.user?.email,
          prestataireRating: service.prestataire?.rating,
        })),
      })
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to fetch services', error })
    }
  }

  /**
   * @tag Services - CRUD
   * @summary Créer un nouveau service
   * @description Crée un service pour un prestataire avec validation
   */
  async create({ request, response }: HttpContext) {
    try {
      const {
        name,
        description,
        price,
        service_type_id: serviceTypeId,
        prestataireId,
        clientId,
        location,
        start_date: startDate,
        end_date: endDate,
        status,
      } = await request.validateUsing(serviceValidator)

      // Validate and parse datetime fields
      let parsedStartDate: DateTime | undefined
      let parsedEndDate: DateTime | undefined

      if (startDate) {
        parsedStartDate = DateTime.fromISO(startDate)
        if (!parsedStartDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid start_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: startDate,
          })
        }
      }

      if (endDate) {
        parsedEndDate = DateTime.fromISO(endDate)
        if (!parsedEndDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid end_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: endDate,
          })
        }
      }

      // Validate that end_date is after start_date
      if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
        return response.status(400).send({
          error_message: 'End date must be after start date',
        })
      }

      // Validate required fields
      if (!name || !description || !price || !location || !startDate || !endDate) {
        return response.status(400).send({
          error_message:
            'Missing required fields: name, description, price, location, start_date, end_date are required',
        })
      }

      // Validate price is a positive number
      if (Number.isNaN(price) || price <= 0) {
        return response.status(400).send({
          error_message: 'Price must be a positive number',
        })
      }

      // Validate prestataireId is a valid number if provided
      if (prestataireId !== undefined && (Number.isNaN(prestataireId) || prestataireId <= 0)) {
        return response.status(400).send({
          error_message: 'prestataireId must be a valid positive number',
        })
      }

      // Validate clientId is a valid number if provided
      if (clientId !== undefined && (Number.isNaN(clientId) || clientId <= 0)) {
        return response.status(400).send({
          error_message: 'clientId must be a valid positive number',
        })
      }

      const service = await Service.create({
        name,
        description,
        price: Number.parseFloat(price.toString()),
        service_type_id: serviceTypeId || null,
        prestataireId: prestataireId ? Number.parseInt(prestataireId.toString()) : undefined,
        clientId: clientId ? Number.parseInt(clientId.toString()) : undefined,
        location,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        status: status || 'scheduled',
        isActive: true,
      })

      return response.created({ service: service.serialize() })
    } catch (error) {
      console.error('Service creation error:', error)

      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') {
        return response.status(400).send({
          error_message: 'Invalid prestataireId: The specified service provider does not exist',
        })
      }

      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        return response.status(400).send({
          error_message: 'A service with this name already exists for this provider',
        })
      }

      return response.status(500).send({
        error_message: 'Failed to create service',
        details: error.message,
      })
    }
  }

  /**
   * Récupère un service spécifique
   */
  async show({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const service = await Service.findOrFail(id)

      return response.ok({ service: service.serialize() })
    } catch (error) {
      return response.status(404).send({ error_message: 'Service not found' })
    }
  }

  /**
   * Met à jour un service existant
   */
  async update({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const {
        name,
        description,
        price,
        duration,
        service_type_id,
        isActive,
        prestataireId,
        location,
        start_date,
        end_date,
        status,
      } = request.body()

      const service = await Service.findOrFail(id)

      // Validate and parse datetime fields if provided
      let parsedStartDate: DateTime | undefined = service.start_date
      let parsedEndDate: DateTime | undefined = service.end_date

      if (start_date) {
        parsedStartDate = DateTime.fromISO(start_date)
        if (!parsedStartDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid start_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: start_date,
          })
        }
      }

      if (end_date) {
        parsedEndDate = DateTime.fromISO(end_date)
        if (!parsedEndDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid end_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: end_date,
          })
        }
      }

      // Validate that end_date is after start_date
      if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
        return response.status(400).send({
          error_message: 'End date must be after start date',
        })
      }

      // Validate price if provided
      if (price !== undefined && (Number.isNaN(price) || price <= 0)) {
        return response.status(400).send({
          error_message: 'Price must be a positive number',
        })
      }

      // Validate prestataireId if provided
      if (prestataireId !== undefined && (Number.isNaN(prestataireId) || prestataireId <= 0)) {
        return response.status(400).send({
          error_message: 'prestataireId must be a valid positive number',
        })
      }

      service.merge({
        name: name || service.name,
        description: description || service.description,
        price: price ? Number.parseFloat(price) : service.price,
        service_type_id: service_type_id !== undefined ? service_type_id : service.service_type_id,
        isActive: isActive !== undefined ? isActive : service.isActive,
        prestataireId: prestataireId ? Number.parseInt(prestataireId) : service.prestataireId,
        location: location || service.location,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        duration: duration !== undefined ? duration : service.duration,
        status: status || service.status,
        updatedAt: DateTime.now(),
      })

      await service.save()

      return response.ok({ service: service.serialize() })
    } catch (error) {
      console.error('Service update error:', error)

      // Handle specific database errors
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') {
        return response.status(400).send({
          error_message: 'Invalid prestataireId: The specified service provider does not exist',
        })
      }

      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        return response.status(400).send({
          error_message: 'A service with this name already exists for this provider',
        })
      }

      return response.status(500).send({
        error_message: 'Failed to update service',
        details: error.message,
      })
    }
  }

  /**
   * Supprime un service
   */
  async delete({ request, response }: HttpContext) {
    try {
      const id = request.param('id')

      // Validate ID is a valid number
      if (Number.isNaN(id) || id <= 0) {
        return response.status(400).send({
          error_message: 'Invalid service ID: must be a positive number',
        })
      }

      const service = await Service.findOrFail(id)

      await service.delete()

      return response.noContent()
    } catch (error) {
      console.error('Service deletion error:', error)

      // Handle service not found
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({
          error_message: 'Service not found',
        })
      }

      // Handle foreign key constraint errors
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23503') {
        return response.status(400).send({
          error_message: 'Cannot delete service: it is referenced by other records',
        })
      }

      return response.status(500).send({
        error_message: 'Failed to delete service',
        details: error.message,
      })
    }
  }

  /**
   * @tag Services - Géolocalisation
   * @summary Services géolocalisés à proximité
   * @description Services à la personne géolocalisés conforme au cahier des charges page 2
   */
  async getNearbyServices({ request, response }: HttpContext) {
    try {
      const { lat, lng, radius } = request.params()
      const latitude = Number.parseFloat(lat)
      const longitude = Number.parseFloat(lng)
      const radiusKm = Number.parseFloat(radius)

      if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radiusKm)) {
        return response.status(400).send({
          error_message: 'Invalid coordinates or radius',
        })
      }

      // Pour cette démo, retourner tous les services actifs
      // Dans un vrai projet, utiliser une requête spatiale
      const services = await Service.query()
        .where('is_active', true)
        .where('status', '!=', 'cancelled')
        .preload('prestataire', (prestataireQuery) => {
          prestataireQuery.preload('user')
        })
        .orderBy('price', 'asc')
        .limit(20)

      return response.ok({
        center: { lat: latitude, lng: longitude },
        radius_km: radiusKm,
        services: services.map((service) => ({
          ...service.serialize(),
          distance_km: Math.random() * radiusKm, // Simulation
          prestataire_name:
            service.prestataire?.user?.first_name + ' ' + service.prestataire?.user?.last_name,
        })),
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch nearby services',
        error: error.message,
      })
    }
  }

  /**
   * @tag Services - Géolocalisation
   * @summary Carte interactive des prestataires
   * @description Données cartographiques pour affichage des prestataires sur carte
   */
  async getServiceProvidersMap({ response }: HttpContext) {
    try {
      const providers = await Prestataire.query()
        .preload('user')
        .preload('services', (servicesQuery) => {
          servicesQuery.where('is_active', true)
        })

      const providersMap = providers.map((provider) => ({
        id: provider.id,
        name: provider.user?.first_name + ' ' + provider.user?.last_name,
        email: provider.user?.email,
        city: provider.user?.city,
        service_type: provider.service_type,
        rating: provider.rating,
        active_services_count: provider.services?.length || 0,
        coordinates: {
          // Simulation - dans un vrai projet, géocoder l'adresse
          lat: 48.8566 + (Math.random() - 0.5) * 0.1,
          lng: 2.3522 + (Math.random() - 0.5) * 0.1,
        },
      }))

      return response.ok({
        providers: providersMap,
        total_providers: providersMap.length,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch service providers map',
        error: error.message,
      })
    }
  }

  /**
   * @tag Services - Analytics
   * @summary Analytics des services (Top 5 prestations)
   * @description Données analytics conformes au cahier des charges page 8 - Top 5 prestations les plus demandées
   */
  async getServiceAnalytics({ response }: HttpContext) {
    try {
      // Stats générales
      const totalServices = await Service.query().count('* as total')
      const activeServices = await Service.query().where('is_active', true).count('* as total')
      const completedServices = await Service.query()
        .where('status', 'completed')
        .count('* as total')

      // Top 5 des prestations les plus demandées (requis par cahier des charges page 8)
      const topServices = await db
        .from('services')
        .select('name', 'service_type_id as serviceTypeId')
        .count('* as demand_count')
        .groupBy('name', 'service_type_id')
        .orderBy('demand_count', 'desc')
        .limit(5)

      // Répartition par type de service
      const servicesByType = await db
        .from('services')
        .join('service_types', 'services.service_type_id', 'service_types.id')
        .select('service_types.name as type_name')
        .count('* as count')
        .groupBy('service_types.name')
        .orderBy('count', 'desc')

      // Statistiques financières
      const revenueStats = await db
        .from('services')
        .where('status', 'completed')
        .select(
          db.raw('SUM(price) as total_revenue'),
          db.raw('AVG(price) as average_price'),
          db.raw('MIN(price) as min_price'),
          db.raw('MAX(price) as max_price')
        )
        .first()

      // Top 5 prestataires les plus actifs
      const topProviders = await db
        .from('services')
        .join('prestataires', 'services.prestataireId', 'prestataires.id')
        .join('utilisateurs', 'prestataires.id', 'utilisateurs.id')
        .select(
          'utilisateurs.first_name as firstName',
          'utilisateurs.last_name as lastName',
          'prestataires.rating'
        )
        .count('* as services_count')
        .groupBy('utilisateurs.first_name', 'utilisateurs.last_name', 'prestataires.rating')
        .orderBy('services_count', 'desc')
        .limit(5)

      return response.ok({
        general_stats: {
          total_services: totalServices[0].$extras.total,
          active_services: activeServices[0].$extras.total,
          completed_services: completedServices[0].$extras.total,
          completion_rate:
            totalServices[0].$extras.total > 0
              ? (
                  (completedServices[0].$extras.total / totalServices[0].$extras.total) *
                  100
                ).toFixed(1)
              : 0,
        },
        top_services: topServices,
        services_by_type: servicesByType,
        revenue_stats: revenueStats,
        top_providers: topProviders,
        generated_at: DateTime.now().toISO(),
      })
    } catch (error) {
      console.error('Service analytics error:', error)
      return response.status(500).send({
        error_message: 'Failed to generate service analytics',
        error: error.message,
      })
    }
  }

  /**
   * @tag Services - Validation Admin
   * @summary Validation d'un service par l'admin
   * @description Workflow de validation des services par les administrateurs
   */
  async validateService({ request, response }: HttpContext) {
    try {
      const serviceId = request.param('id')
      const { validation_status: validationStatus, admin_comments: adminComments } = request.body()

      if (!['approved', 'rejected', 'pending'].includes(validationStatus)) {
        return response.status(400).send({
          error_message: 'Invalid validation status. Must be: approved, rejected, or pending',
        })
      }

      const service = await Service.findOrFail(serviceId)

      // Mise à jour du statut
      service.merge({
        status:
          validationStatus === 'approved'
            ? 'scheduled'
            : validationStatus === 'rejected'
              ? 'cancelled'
              : service.status,
        // Ajout d'un champ commentaire admin si nécessaire
        updatedAt: DateTime.now(),
      })

      await service.save()

      return response.ok({
        message: `Service ${validationStatus} successfully`,
        service: service.serialize(),
        admin_comments: adminComments || null,
      })
    } catch (error) {
      console.error('Service validation error:', error)
      return response.status(500).send({
        error_message: 'Failed to validate service',
        error: error.message,
      })
    }
  }

  /**
   * Calendrier des disponibilités des prestataires
   */
  async getProviderCalendar({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('prestataireId') || request.qs().prestataireId
      const month = request.qs().month || DateTime.now().month
      const year = request.qs().year || DateTime.now().year

      if (!prestataireId) {
        return response.status(400).send({
          error_message: 'prestataireId is required',
        })
      }

      // Vérifier que le prestataire existe
      const prestataire = await Prestataire.findOrFail(prestataireId)
      // Simple query without preload to avoid type issues
      const prestataireUser = await db.from('utilisateurs').where('id', prestataireId).first()

      // Récupérer les services du mois
      const startOfMonth = DateTime.fromObject({
        year: Number.parseInt(year),
        month: Number.parseInt(month),
        day: 1,
      })
      const endOfMonth = startOfMonth.endOf('month')

      const services = await Service.query()
        .where('prestataireId', prestataireId)
        .whereBetween('start_date', [startOfMonth.toSQL()!, endOfMonth.toSQL()!])
        .orderBy('start_date', 'asc')

      // Générer le calendrier avec disponibilités
      const calendarData = {
        prestataire: {
          id: prestataire.id,
          name: prestataireUser?.first_name + ' ' + prestataireUser?.last_name,
          service_type: prestataire.service_type,
          rating: prestataire.rating,
        },
        month: Number.parseInt(month),
        year: Number.parseInt(year),
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          start_date: service.start_date.toISODate(),
          end_date: service.end_date.toISODate(),
          start_time: service.start_date.toFormat('HH:mm'),
          end_time: service.end_date.toFormat('HH:mm'),
          status: service.status,
          price: service.price,
          duration: service.duration,
        })),
        available_slots: this.generateAvailableSlots(services, startOfMonth, endOfMonth),
      }

      return response.ok(calendarData)
    } catch (error) {
      console.error('Provider calendar error:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch provider calendar',
        error: error.message,
      })
    }
  }

  /**
   * Génération de créneaux disponibles (helper)
   */
  private generateAvailableSlots(
    services: Service[],
    startOfMonth: DateTime,
    endOfMonth: DateTime
  ) {
    const availableSlots = []
    const workingHours = { start: 8, end: 18 } // 8h-18h

    // Pour chaque jour du mois
    let currentDate = startOfMonth
    while (currentDate <= endOfMonth) {
      // Ignorer les dimanches
      if (currentDate.weekday !== 7) {
        // Trouver les services de ce jour
        const dayServices = services.filter((service) =>
          service.start_date.hasSame(currentDate, 'day')
        )

        // Générer les créneaux libres (simulation simple)
        if (dayServices.length < 3) {
          // Max 3 services par jour
          availableSlots.push({
            date: currentDate.toISODate(),
            slots: [
              { start: '09:00', end: '11:00', available: dayServices.length === 0 },
              { start: '14:00', end: '16:00', available: dayServices.length <= 1 },
              { start: '16:30', end: '18:00', available: dayServices.length <= 2 },
            ],
          })
        }
      }
      currentDate = currentDate.plus({ days: 1 })
    }

    return availableSlots
  }
}
