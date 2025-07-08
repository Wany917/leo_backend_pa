import type { HttpContext } from '@adonisjs/core/http'
import Service from '#models/service'
import Prestataire from '#models/prestataire'
import ServiceType from '#models/service_type'
import Client from '#models/client'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'
import { DateTime } from 'luxon'
import { serviceValidator } from '#validators/create_service'
import db from '@adonisjs/lucid/services/db'

export default class ServicesController {
  /**
   * @tag Services - CRUD
   * @summary Lister tous les services
   * @description Récupère la liste de tous les services avec prestataires et types
   */
  async index({ request, response }: HttpContext) {
    try {
      const qs = request.qs()
      const prestataireId = qs.prestataire_id

      let query = Service.query()
        .preload('prestataire', (prestataireQuery) => {
          prestataireQuery.preload('user')
        })
        .preload('serviceType')

      // Filtrer par prestataire si spécifié
      if (prestataireId) {
        const prestataireIdNumber = Number.parseInt(prestataireId)
        if (!Number.isNaN(prestataireIdNumber)) {
          query = query.where('prestataireId', prestataireIdNumber)
        }
      }

      const services = await query.orderBy('created_at', 'desc')

      return response.ok({
        data: services.map((service) => ({
          ...service.serialize(),
          prestataireName:
            service.prestataire?.user?.first_name + ' ' + service.prestataire?.user?.last_name,
          prestataireEmail: service.prestataire?.user?.email,
          prestataireRating: service.prestataire?.rating,
          serviceTypeName: service.serviceType?.name || null,
          service_type_name: service.serviceType?.name || null, // Alias pour le frontend
          isActive: service.isActive, // Assurer que isActive est bien retourné
        })),
        total: services.length,
        prestataire_id: prestataireId || null,
      })
    } catch (error) {
      console.error('Services index error:', error)
      return response
        .status(500)
        .send({ error_message: 'Failed to fetch services', error: error.message })
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

      if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radiusKm)) {
        return response.status(400).send({
          error_message: 'Invalid coordinates or radius',
        })
      }

      // Pour cette démo, retourner tous les services actifs
      // Dans un vrai projet, utiliser une requête spatiale
      const services = await Service.query()
        .where('is_active', true)
        .where('status', 'available')
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

      // Charger le prestataire et ses justificatifs
      await service.load('prestataire', (prestataireQuery) => {
        prestataireQuery.preload('user')
      })

      // Vérifier les justificatifs si nécessaire
      if (requireJustifications && validationStatus === 'approved') {
        const justifications = await db
          .from('justification_pieces')
          .where('utilisateur_id', service.prestataire?.user?.id)
          .where('account_type', 'prestataire')
          .where('verification_status', 'verified')

        if (justifications.length === 0) {
          return response.status(400).send({
            error_message:
              'Cannot approve service: No verified justifications found for this provider',
            requires_justifications: true,
            available_justifications: await db
              .from('justification_pieces')
              .where('utilisateur_id', service.prestataire?.user?.id)
              .where('account_type', 'prestataire')
              .select('id', 'document_type', 'verification_status'),
          })
        }
      }

      // Mise à jour du statut selon la validation
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
        .preload('prestataire', (prestataireQuery) => {
          prestataireQuery.preload('user')
        })
        .preload('serviceType')
        .orderBy('created_at', 'desc')

      // Récupérer les pièces justificatives pour chaque prestataire
      const servicesWithJustifications = await Promise.all(
        pendingServices.map(async (service) => {
          const justifications = await db
            .from('justification_pieces')
            .where('utilisateur_id', service.prestataire?.user?.id)
            .where('account_type', 'prestataire')
            .orderBy('created_at', 'desc')

          return {
            ...service.serialize(),
            prestataire_name: service.prestataire?.user
              ? `${service.prestataire.user.first_name} ${service.prestataire.user.last_name}`
              : 'Prestataire inconnu',
            service_type_name: service.serviceType?.name || 'Type non défini',
            prestataire_email: service.prestataire?.user?.email || 'Email non disponible',
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

  // ===============================================
  // 🆕 SYSTÈME PAIEMENT SERVICES PRESTATAIRES CLIENTS
  // ===============================================

  /**
   * 💰 FINALISER SERVICE ET DISTRIBUER GAINS
   * Marque un service comme terminé et distribue les gains au prestataire
   */
  async completeServiceAndDistributePayment({ request, response, auth }: HttpContext) {
    try {
      const serviceId = request.param('id')
      const { payment_intent_id: paymentIntentId, validation_code: validationCode } = request.only([
        'payment_intent_id',
        'validation_code',
      ])

      const user = auth.user!

      // Récupérer le service avec les relations
      const service = await Service.query()
        .where('id', serviceId)
        .preload('prestataire')
        .preload('client')
        .first()

      if (!service) {
        return response.badRequest({
          success: false,
          message: 'Service introuvable',
        })
      }

      // Vérifier que le service est payé et en cours
      if (service.status !== 'paid' && service.status !== 'in_progress') {
        return response.badRequest({
          success: false,
          message: 'Le service doit être payé pour être finalisé',
        })
      }

      // Calculer la commission EcoDeli (8% pour les services)
      const commission = service.price * 0.08
      const montantPrestataire = service.price - commission

      // Récupérer ou créer le portefeuille du prestataire
      let portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', service.prestataireId)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        portefeuille = await PortefeuilleEcodeli.create({
          utilisateurId: service.prestataireId,
          soldeDisponible: 0,
          soldeEnAttente: 0,
          isActive: true,
        })
      }

      // Ajouter les gains directement au solde disponible
      const ancienSolde = portefeuille.soldeDisponible
      portefeuille.soldeDisponible = ancienSolde + montantPrestataire
      await portefeuille.save()

      // Enregistrer la transaction de gain
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: service.prestataireId,
        typeTransaction: 'liberation',
        montant: montantPrestataire,
        soldeAvant: ancienSolde,
        soldeApres: portefeuille.soldeDisponible,
        description: `Gains service "${service.name}" - Commission EcoDeli: ${commission}€`,
        referenceExterne: paymentIntentId || serviceId.toString(),
        serviceId: service.id,
        statut: 'completed',
        metadata: JSON.stringify({
          type: 'service_payment',
          service_name: service.name,
          commission_ecodeli: commission,
          montant_brut: service.price,
          client_id: service.clientId,
        }),
      })

      // Marquer le service comme terminé
      service.status = 'completed'
      await service.save()

      console.log(
        `✅ Service ${service.id} terminé - Prestataire reçoit: ${montantPrestataire}€, Commission: ${commission}€`
      )

      return response.ok({
        success: true,
        message: `Service terminé avec succès. Vous avez reçu ${montantPrestataire}€ dans votre cagnotte.`,
        data: {
          service_id: service.id,
          montant_recu: montantPrestataire,
          commission_ecodeli: commission,
          nouveau_solde: portefeuille.soldeDisponible,
          service_status: 'completed',
        },
      })
    } catch (error) {
      console.error('❌ Erreur finalisation service:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la finalisation du service',
        error: error.message,
      })
    }
  }

  /**
   * 📊 RÉCUPÉRER GAINS PRESTATAIRE
   * Statistiques des gains pour un prestataire client
   */
  async getProviderEarnings({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      // Vérifier que l'utilisateur est un prestataire
      const prestataire = await Prestataire.query().where('id', user.id).first()
      if (!prestataire) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non trouvé en tant que prestataire',
        })
      }

      // Récupérer le portefeuille
      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        return response.ok({
          success: true,
          data: {
            gains_totaux: 0,
            gains_ce_mois: 0,
            gains_cette_semaine: 0,
            nombre_services_completes: 0,
            solde_disponible: 0,
            services_recents: [],
          },
        })
      }

      // Récupérer les transactions de gains (services)
      const gainsTransactions = await TransactionPortefeuille.query()
        .where('portefeuille_id', portefeuille.id)
        .where('type_transaction', 'liberation')
        .whereNotNull('service_id')
        .orderBy('created_at', 'desc')

      const gainsTotaux = gainsTransactions.reduce((total, t) => total + t.montant, 0)

      // Gains du mois en cours
      const debutMois = new Date()
      debutMois.setDate(1)
      debutMois.setHours(0, 0, 0, 0)

      const gainsCeMois = gainsTransactions
        .filter((t) => new Date(t.createdAt.toString()) >= debutMois)
        .reduce((total, t) => total + t.montant, 0)

      // Gains de la semaine
      const debutSemaine = new Date()
      debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay())
      debutSemaine.setHours(0, 0, 0, 0)

      const gainsCetteSemaine = gainsTransactions
        .filter((t) => new Date(t.createdAt.toString()) >= debutSemaine)
        .reduce((total, t) => total + t.montant, 0)

      // Services complétés
      const servicesCompletes = await Service.query()
        .where('prestataireId', user.id)
        .where('status', 'completed')
        .orderBy('updated_at', 'desc')
        .limit(5)

      return response.ok({
        success: true,
        data: {
          gains_totaux: gainsTotaux,
          gains_ce_mois: gainsCeMois,
          gains_cette_semaine: gainsCetteSemaine,
          nombre_services_completes: gainsTransactions.length,
          solde_disponible: portefeuille.soldeDisponible,
          services_recents: servicesCompletes.map((service) => ({
            id: service.id,
            name: service.name,
            price: service.price,
            completed_at: service.updatedAt.toISODate(),
            commission_ecodeli: service.price * 0.08,
            gains_nets: service.price * 0.92,
          })),
          transactions_recentes: gainsTransactions.slice(0, 10).map((transaction) => ({
            id: transaction.id,
            montant: transaction.montant,
            description: transaction.description,
            date: transaction.createdAt.toISODate(),
            metadata: transaction.getMetadataAsJson(),
          })),
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération gains prestataire:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des gains',
        error: error.message,
      })
    }
  }

  /**
   * 🎯 SERVICES EN ATTENTE DE PAIEMENT
   * Liste des services en attente de paiement pour un prestataire
   */
  async getPendingPaymentServices({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      // Vérifier que l'utilisateur est un prestataire
      const prestataire = await Prestataire.query().where('id', user.id).first()
      if (!prestataire) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non trouvé en tant que prestataire',
        })
      }

      // Récupérer les services en attente de paiement ou en cours
      const servicesPendants = await Service.query()
        .where('prestataireId', user.id)
        .whereIn('status', ['scheduled', 'in_progress', 'paid'])
        .orderBy('start_date', 'asc')

      const servicesGroupes = {
        scheduled: servicesPendants.filter((s) => s.status === 'scheduled'),
        in_progress: servicesPendants.filter((s) => s.status === 'in_progress'),
        paid: servicesPendants.filter((s) => s.status === 'paid'),
      }

      const montantTotal = servicesPendants.reduce((total, service) => {
        // Calculer les gains nets (prix - commission 8%)
        return total + service.price * 0.92
      }, 0)

      return response.ok({
        success: true,
        data: {
          services_par_statut: servicesGroupes,
          total_services_pendants: servicesPendants.length,
          montant_total_attendu: montantTotal,
          services: servicesPendants.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: service.price,
            gains_nets_attendus: service.price * 0.92,
            commission_ecodeli: service.price * 0.08,
            status: service.status,
            start_date: service.start_date.toISODate(),
            end_date: service.end_date.toISODate(),
            location: service.location,
          })),
        },
      })
    } catch (error) {
      console.error('❌ Erreur récupération services pendants:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des services en attente',
        error: error.message,
      })
    }
  }

  /**
   * 📈 TABLEAU DE BORD PRESTATAIRE
   * Vue d'ensemble des performances pour un prestataire client
   */
  async getProviderDashboard({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      // Vérifier que l'utilisateur est un prestataire
      const prestataire = await Prestataire.query().where('id', user.id).first()
      if (!prestataire) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non trouvé en tant que prestataire',
        })
      }

      // Statistiques générales
      const statsGenerales = await Service.query()
        .where('prestataireId', user.id)
        .select(
          db.raw('COUNT(*) as total_services'),
          db.raw('COUNT(CASE WHEN status = "completed" THEN 1 END) as services_completes'),
          db.raw('COUNT(CASE WHEN status = "scheduled" THEN 1 END) as services_programmes'),
          db.raw('COUNT(CASE WHEN status = "in_progress" THEN 1 END) as services_en_cours'),
          db.raw('SUM(CASE WHEN status = "completed" THEN price ELSE 0 END) as revenus_totaux'),
          db.raw('AVG(CASE WHEN status = "completed" THEN price ELSE NULL END) as prix_moyen')
        )
        .first()

      // Portefeuille
      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      // Services récents
      const servicesRecents = await Service.query()
        .where('prestataireId', user.id)
        .orderBy('updated_at', 'desc')
        .limit(5)

      // Évolution mensuelle (derniers 6 mois)
      const evolutionMensuelle = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const debutMois = new Date(date.getFullYear(), date.getMonth(), 1)
        const finMois = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const statsMonth = await Service.query()
          .where('prestataireId', user.id)
          .where('status', 'completed')
          .whereBetween('updated_at', [debutMois.toISOString(), finMois.toISOString()])
          .select(db.raw('COUNT(*) as services_count'), db.raw('SUM(price) as revenus'))
          .first()

        evolutionMensuelle.push({
          mois: date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
          services_count: statsMonth?.$extras.services_count || 0,
          revenus: (statsMonth?.$extras.revenus || 0) * 0.92, // Revenus nets
        })
      }

      return response.ok({
        success: true,
        data: {
          prestataire: {
            id: prestataire.id,
            service_type: prestataire.service_type,
            rating: prestataire.rating,
          },
          statistiques: {
            total_services: statsGenerales?.$extras.total_services || 0,
            services_completes: statsGenerales?.$extras.services_completes || 0,
            services_programmes: statsGenerales?.$extras.services_programmes || 0,
            services_en_cours: statsGenerales?.$extras.services_en_cours || 0,
            revenus_totaux_bruts: statsGenerales?.$extras.revenus_totaux || 0,
            revenus_totaux_nets: (statsGenerales?.$extras.revenus_totaux || 0) * 0.92,
            prix_moyen: statsGenerales?.$extras.prix_moyen || 0,
            taux_completion:
              statsGenerales?.$extras.total_services > 0
                ? (
                    (statsGenerales?.$extras.services_completes /
                      statsGenerales?.$extras.total_services) *
                    100
                  ).toFixed(1)
                : 0,
          },
          portefeuille: {
            solde_disponible: portefeuille?.soldeDisponible || 0,
            solde_en_attente: portefeuille?.soldeEnAttente || 0,
            solde_total: portefeuille?.soldeTotal || 0,
          },
          services_recents: servicesRecents.map((service) => ({
            id: service.id,
            name: service.name,
            price: service.price,
            status: service.status,
            date: service.start_date.toISODate(),
          })),
          evolution_mensuelle: evolutionMensuelle,
          generated_at: DateTime.now().toISO(),
        },
      })
    } catch (error) {
      console.error('❌ Erreur tableau de bord prestataire:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la génération du tableau de bord',
        error: error.message,
      })
    }
  }
}
