import type { HttpContext } from '@adonisjs/core/http'
import Service from '#models/service'
import Prestataire from '#models/prestataire'
// import ServiceType from '#models/service_type'
import { DateTime } from 'luxon'
import { serviceValidator } from '#validators/create_service'
import db from '@adonisjs/lucid/services/db'
// import type { ModelObject } from '@adonisjs/lucid/types/model'
// import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'

export default class ServicesController {
  async index({ request, response }: HttpContext) {
    try {
      const qs = request.qs()
      const prestataireId = qs.prestataire_id
      const page = Number.parseInt(qs.page || '1')
      const limit = Number.parseInt(qs.limit || '20')
      const sortBy = qs.sort_by || 'created_at'
      const sortOrder = qs.sort_order === 'asc' ? 'asc' : 'desc'

      // Validation des paramètres
      if (Number.isNaN(page) || page < 1) {
        return response.status(400).send({
          error_message: 'Invalid page number',
        })
      }

      if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return response.status(400).send({
          error_message: 'Invalid limit value (must be between 1 and 100)',
        })
      }

      const allowedSortFields = ['created_at', 'price', 'name', 'status']
      if (!allowedSortFields.includes(sortBy)) {
        return response.status(400).send({
          error_message: 'Invalid sort field',
          allowed_fields: allowedSortFields,
        })
      }

      let query = Service.query().preload('prestataire').preload('serviceType')

      if (prestataireId) {
        const prestataireIdNumber = Number.parseInt(prestataireId)
        if (!Number.isNaN(prestataireIdNumber)) {
          query = query.where('prestataireId', prestataireIdNumber)
        } else {
          return response.status(400).send({
            error_message: 'Invalid prestataireId format',
          })
        }
      }

      // On retire la pagination pour simplifier
      const services = await query.orderBy(sortBy, sortOrder)

      // Charger les utilisateurs séparément avec une seule requête
      const prestataireIds = services.map((s) => s.prestataire?.id).filter(Boolean) as number[]
      const users = await Utilisateurs.query().whereIn('id', prestataireIds)
      const usersMap = new Map(users.map((u) => [u.id, u]))

      const mappedServices = services.map((service) => {
        const user = service.prestataire ? usersMap.get(service.prestataire.id) : null
        return {
          id: service.id,
          name: service.name,
          description: service.description,
          price: service.price,
          pricing_type: service.pricing_type,
          hourly_rate: service.hourly_rate,
          location: service.location,
          status: service.status,
          availability_description: service.availability_description,
          home_service: service.home_service,
          requires_materials: service.requires_materials,
          duration: service.duration,
          isActive: service.isActive,
          prestataireName: user ? `${user.first_name} ${user.last_name}` : 'Prestataire inconnu',
          prestataireEmail: user?.email,
          prestataireRating: service.prestataire?.rating,
          serviceTypeName: service.serviceType?.name || null,
        }
      })

      return response.ok(mappedServices)
    } catch (error) {
      console.error('Services index error:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch services',
        error: error.message,
      })
    }
  }

  async create({ request, response }: HttpContext) {
    try {
      const {
        name,
        description,
        price,
        pricing_type,
        hourly_rate,
        service_type_id: serviceTypeId,
        prestataireId,
        location,
        status,
        duration,
        availability_description,
        home_service,
        requires_materials,
      } = await request.validateUsing(serviceValidator)

      // Validate required fields
      if (!name || !description || price === undefined || price === null || !location) {
        return response.status(400).send({
          error_message: 'Missing required fields: name, description, price, location are required',
        })
      }

      // Validate price is a valid number >= 0
      if (Number.isNaN(price) || price < 0) {
        return response.status(400).send({
          error_message: 'Price must be a non-negative number',
        })
      }

      // For hourly pricing, price can be 0 but hourly_rate must be > 0
      if (pricing_type === 'hourly' && price === 0 && (!hourly_rate || hourly_rate <= 0)) {
        return response.status(400).send({
          error_message:
            'For hourly pricing, hourly_rate must be a positive number when price is 0',
        })
      }

      // Validate prestataireId is a valid number if provided
      if (prestataireId !== undefined && (Number.isNaN(prestataireId) || prestataireId <= 0)) {
        return response.status(400).send({
          error_message: 'prestataireId must be a valid positive number',
        })
      }

      const service = await Service.create({
        name,
        description,
        price: Number.parseFloat(price.toString()),
        pricing_type: pricing_type || 'fixed',
        hourly_rate: hourly_rate ? Number.parseFloat(hourly_rate.toString()) : null,
        service_type_id: serviceTypeId || null,
        prestataireId: prestataireId ? Number.parseInt(prestataireId.toString()) : undefined,
        location,
        status: 'pending', // Nouveaux services sont toujours en attente de validation
        duration: duration || null,
        availability_description: availability_description || null,
        home_service: home_service !== undefined ? home_service : true,
        requires_materials: requires_materials !== undefined ? requires_materials : false,
        isActive: false, // Inactif jusqu'à validation admin
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
      const serviceId = Number.parseInt(id)

      if (Number.isNaN(serviceId) || serviceId <= 0) {
        return response.status(400).send({
          error_message: 'Invalid service ID: must be a positive number',
        })
      }

      const service = await Service.findOrFail(serviceId)

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
      const serviceId = Number.parseInt(id)

      if (Number.isNaN(serviceId) || serviceId <= 0) {
        return response.status(400).send({
          error_message: 'Invalid service ID: must be a positive number',
        })
      }

      const {
        name,
        description,
        price,
        duration,
        pricing_type,
        hourly_rate,
        service_type_id,
        isActive,
        prestataireId,
        location,
        status,
        availability_description,
        home_service,
        requires_materials,
      } = request.body()

      const service = await Service.findOrFail(serviceId)

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
        pricing_type: pricing_type || service.pricing_type,
        hourly_rate: hourly_rate ? Number.parseFloat(hourly_rate) : service.hourly_rate,
        service_type_id: service_type_id !== undefined ? service_type_id : service.service_type_id,
        isActive: isActive !== undefined ? isActive : service.isActive,
        prestataireId: prestataireId ? Number.parseInt(prestataireId) : service.prestataireId,
        location: location || service.location,
        duration: duration !== undefined ? duration : service.duration,
        status: status || service.status,
        availability_description: availability_description || service.availability_description,
        home_service: home_service !== undefined ? home_service : service.home_service,
        requires_materials:
          requires_materials !== undefined ? requires_materials : service.requires_materials,
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
      const serviceId = Number.parseInt(id)

      // Validate ID is a valid number
      if (Number.isNaN(serviceId) || serviceId <= 0) {
        return response.status(400).send({
          error_message: 'Invalid service ID: must be a positive number',
        })
      }

      const service = await Service.findOrFail(serviceId)

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
      const limit = Number.parseInt(request.qs().limit || '20')
      const page = Number.parseInt(request.qs().page || '1')

      // Validation des paramètres
      if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
        return response.status(400).send({
          error_message: 'Invalid latitude (must be between -90 and 90)',
        })
      }

      if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
        return response.status(400).send({
          error_message: 'Invalid longitude (must be between -180 and 180)',
        })
      }

      if (Number.isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
        return response.status(400).send({
          error_message: 'Invalid radius (must be between 0 and 100 km)',
        })
      }

      if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return response.status(400).send({
          error_message: 'Invalid limit value (must be between 1 and 100)',
        })
      }

      if (Number.isNaN(page) || page < 1) {
        return response.status(400).send({
          error_message: 'Invalid page number',
        })
      }

      const services = await Service.query()
        .where('is_active', true)
        .where('status', 'available')
        .preload('prestataire')
        .orderBy('price', 'asc')
        .paginate(page, limit)

      // Charger les utilisateurs séparément avec une seule requête
      const prestataireIds = services.map((s) => s.prestataire?.id).filter(Boolean) as number[]
      const users = await Utilisateurs.query().whereIn('id', prestataireIds)
      const usersMap = new Map(users.map((u) => [u.id, u]))

      return response.ok({
        center: { lat: latitude, lng: longitude },
        radius_km: radiusKm,
        services: services.map((service) => {
          const user = service.prestataire ? usersMap.get(service.prestataire.id) : null
          return {
            ...service.serialize(),
            distance_km: Math.random() * radiusKm, // TODO: Implémenter le calcul réel de la distance
            prestataire_name: user ? `${user.first_name} ${user.last_name}` : 'Prestataire inconnu',
          }
        }),
        meta: {
          total: services.total || 0,
          per_page: services.perPage,
          current_page: services.currentPage,
          last_page: services.lastPage,
          first_page: 1,
        },
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
  async getServiceProvidersMap({ request, response }: HttpContext) {
    try {
      const { lat, lng, radius } = request.qs()
      const latitude = lat ? Number.parseFloat(lat) : null
      const longitude = lng ? Number.parseFloat(lng) : null
      const radiusKm = radius ? Number.parseFloat(radius) : 10

      // Validation des paramètres optionnels
      if (latitude !== null && (Number.isNaN(latitude) || latitude < -90 || latitude > 90)) {
        return response.status(400).send({
          error_message: 'Invalid latitude (must be between -90 and 90)',
        })
      }

      if (longitude !== null && (Number.isNaN(longitude) || longitude < -180 || longitude > 180)) {
        return response.status(400).send({
          error_message: 'Invalid longitude (must be between -180 and 180)',
        })
      }

      if (Number.isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
        return response.status(400).send({
          error_message: 'Invalid radius (must be between 0 and 100 km)',
        })
      }

      const providers = await Prestataire.query().preload('services', (servicesQuery) => {
        servicesQuery.where('is_active', true)
      })

      // Charger les utilisateurs séparément avec une seule requête
      const providerIds = providers.map((p) => p.id)
      const users = await Utilisateurs.query().whereIn('id', providerIds)
      const usersMap = new Map(users.map((u) => [u.id, u]))

      const providersMap = providers.map((provider) => {
        const user = usersMap.get(provider.id)
        return {
          id: provider.id,
          name: user ? `${user.first_name} ${user.last_name}` : 'Prestataire inconnu',
          email: user?.email,
          city: user?.city,
          service_type: provider.service_type,
          rating: provider.rating,
          active_services_count: provider.services?.length || 0,
          coordinates: {
            // TODO: Implémenter les coordonnées réelles des prestataires
            lat: 48.8566 + (Math.random() - 0.5) * 0.1,
            lng: 2.3522 + (Math.random() - 0.5) * 0.1,
          },
        }
      })

      return response.ok({
        center: latitude && longitude ? { lat: latitude, lng: longitude } : null,
        radius_km: radiusKm,
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
      const {
        validation_status: validationStatus,
        admin_comments: adminComments,
        require_justifications: requireJustifications = true,
      } = request.body()

      if (!['approved', 'rejected', 'pending'].includes(validationStatus)) {
        return response.status(400).send({
          error_message: 'Invalid validation status. Must be: approved, rejected, or pending',
        })
      }

      const service = await Service.findOrFail(serviceId)
      await service.load('prestataire')

      // Charger l'utilisateur séparément
      const prestataireId = service.prestataire?.id
      const user = prestataireId ? await Utilisateurs.find(prestataireId) : null

      if (requireJustifications && validationStatus === 'approved') {
        if (!user?.id) {
          return response.status(400).send({
            error_message: 'Cannot approve service: Provider user not found',
          })
        }

        const justifications = await db
          .from('justification_pieces')
          .where('utilisateur_id', user.id)
          .where('account_type', 'prestataire')
          .where('verification_status', 'verified')

        if (justifications.length === 0) {
          return response.status(400).send({
            error_message:
              'Cannot approve service: No verified justifications found for this provider',
            requires_justifications: true,
            available_justifications: await db
              .from('justification_pieces')
              .where('utilisateur_id', user.id)
              .where('account_type', 'prestataire')
              .select('id', 'document_type', 'verification_status'),
          })
        }
      }

      let newStatus: string
      let isActive: boolean

      switch (validationStatus) {
        case 'approved':
          newStatus = 'available'
          isActive = true
          break
        case 'rejected':
          newStatus = 'refused'
          isActive = false
          break
        case 'pending':
          newStatus = 'pending'
          isActive = false
          break
        default:
          newStatus = service.status
          isActive = service.isActive
      }

      service.merge({
        status: newStatus,
        isActive: isActive,
        updatedAt: DateTime.now(),
      })

      await service.save()

      return response.ok({
        message: `Service ${validationStatus} successfully`,
        service: service.serialize(),
        admin_comments: adminComments || null,
        justifications_verified: requireJustifications && validationStatus === 'approved',
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
   * @tag Services - Admin
   * @summary Services en attente de validation avec justificatifs
   * @description Récupère tous les services en statut 'pending' avec leurs pièces justificatives
   */
  async getPendingServices({ response }: HttpContext) {
    try {
      const pendingServices = await Service.query()
        .where('status', 'pending')
        .preload('prestataire')
        .preload('serviceType')
        .orderBy('created_at', 'desc')

      // Charger les utilisateurs séparément
      const prestataireIds = pendingServices
        .map((s) => s.prestataire?.id)
        .filter(Boolean) as number[]
      const users = await Utilisateurs.query().whereIn('id', prestataireIds)
      const usersMap = new Map(users.map((u) => [u.id, u]))

      const servicesWithJustifications = await Promise.all(
        pendingServices.map(async (service) => {
          const user = service.prestataire ? usersMap.get(service.prestataire.id) : null
          let justifications = []

          if (user?.id) {
            justifications = await db
              .from('justification_pieces')
              .where('utilisateur_id', user.id)
              .where('account_type', 'prestataire')
              .orderBy('created_at', 'desc')
          }

          return {
            ...service.serialize(),
            prestataire_name: user ? `${user.first_name} ${user.last_name}` : 'Prestataire inconnu',
            service_type_name: service.serviceType?.name || 'Type non défini',
            prestataire_email: user?.email || 'Email non disponible',
            justifications: justifications.map((justif) => ({
              id: justif.id,
              document_type: justif.document_type,
              file_path: justif.file_path,
              verification_status: justif.verification_status,
              uploaded_at: justif.uploaded_at,
              verified_at: justif.verified_at,
            })),
            has_verified_justifications: justifications.some(
              (j) => j.verification_status === 'verified'
            ),
            total_justifications: justifications.length,
            pending_justifications: justifications.filter(
              (j) => j.verification_status === 'pending'
            ).length,
          }
        })
      )

      return response.ok({
        pending_services: servicesWithJustifications,
        total_pending: pendingServices.length,
      })
    } catch (error) {
      console.error('Get pending services error:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch pending services',
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

      const prestataire = await Prestataire.findOrFail(prestataireId)
      const prestataireUser = await Utilisateurs.findOrFail(prestataireId)

      const startOfMonth = DateTime.fromObject({
        year: Number.parseInt(year.toString()),
        month: Number.parseInt(month.toString()),
        day: 1,
      })
      const endOfMonth = startOfMonth.endOf('month')

      const services = await Service.query()
        .where('prestataireId', prestataireId)
        .whereBetween('start_date', [startOfMonth.toSQL()!, endOfMonth.toSQL()!])
        .orderBy('start_date', 'asc')

      const calendarData = {
        prestataire: {
          id: prestataire.id,
          name: `${prestataireUser.first_name} ${prestataireUser.last_name}`,
          service_type: prestataire.service_type,
          rating: prestataire.rating,
        },
        month: Number.parseInt(month.toString()),
        year: Number.parseInt(year.toString()),
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          start_date: service.start_date?.toISODate(),
          end_date: service.end_date?.toISODate(),
          start_time: service.start_date?.toFormat('HH:mm'),
          end_time: service.end_date?.toFormat('HH:mm'),
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
    const workingHours = { start: 8, end: 18 }

    let currentDate = startOfMonth
    while (currentDate <= endOfMonth) {
      if (currentDate.weekday !== 7) {
        const dayServices = services.filter((service) =>
          service.start_date?.hasSame(currentDate, 'day')
        )

        if (dayServices.length < 3) {
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
