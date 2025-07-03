import type { HttpContext } from '@adonisjs/core/http'
import ServiceType from '#models/service_type'
import { createServiceTypeValidator } from '#validators/create_service_type'
import db from '@adonisjs/lucid/services/db'

export default class ServiceTypesController {
  /**
   * @tag ServiceTypes - CRUD
   * @summary Lister tous les types de services
   * @description Récupère tous les types de services avec le nombre de services associés
   */
  async index({ request, response }: HttpContext) {
    try {
      const includeInactive = request.input('include_inactive', false)

      let query = db
        .from('service_types')
        .leftJoin('services', 'service_types.id', 'services.service_type_id')
        .select('service_types.*', db.raw('COUNT(services.id) as service_count'))
        .groupBy('service_types.id')
        .orderBy('service_types.name', 'asc')

      if (!includeInactive) {
        query = query.where('service_types.is_active', true)
      }

      const serviceTypes = await query

      return response.ok({
        serviceTypes: serviceTypes,
      })
    } catch (error) {
      console.error('Error fetching service types:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch service types',
        error: error.message,
      })
    }
  }

  /**
   * @tag ServiceTypes - CRUD
   * @summary Créer un nouveau type de service
   * @description Crée un nouveau type de service
   */
  async create({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createServiceTypeValidator)
      
      const serviceType = await ServiceType.create({
        name: payload.name,
        description: payload.description || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
      })

      return response.created({
        message: 'Type de service créé avec succès',
        serviceType: serviceType,
      })
    } catch (error) {
      console.error('Error creating service type:', error)
      return response.status(500).send({
        error_message: 'Failed to create service type',
        error: error.message,
      })
    }
  }

  /**
   * @tag ServiceTypes - CRUD
   * @summary Récupérer un type de service par ID
   * @description Affiche les détails d'un type de service spécifique
   */
  async show({ request, response }: HttpContext) {
    try {
      const id = request.param('id')

      const serviceType = await db
        .from('service_types')
        .leftJoin('services', 'service_types.id', 'services.service_type_id')
        .select('service_types.*', db.raw('COUNT(services.id) as service_count'))
        .where('service_types.id', id)
        .groupBy('service_types.id')
        .first()

      if (!serviceType) {
        return response.status(404).send({
          error_message: 'Type de service non trouvé',
        })
      }

      return response.ok({
        serviceType: serviceType,
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch service type',
        error: error.message,
      })
    }
  }

  /**
   * @tag ServiceTypes - CRUD
   * @summary Mettre à jour un type de service
   * @description Met à jour les informations d'un type de service
   */
  async update({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const payload = await request.validateUsing(createServiceTypeValidator)

      const serviceType = await ServiceType.findOrFail(id)

      serviceType.name = payload.name
      serviceType.description = payload.description || null
      if (payload.is_active !== undefined) {
        serviceType.is_active = payload.is_active
      }

      await serviceType.save()

      return response.ok({
        message: 'Type de service mis à jour avec succès',
        serviceType: serviceType,
      })
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({
          error_message: 'Type de service non trouvé',
        })
      }
      return response.status(500).send({
        error_message: 'Failed to update service type',
        error: error.message,
      })
    }
  }

  /**
   * @tag ServiceTypes - CRUD
   * @summary Activer/Désactiver un type de service
   * @description Bascule le statut actif/inactif d'un type de service
   */
  async toggleStatus({ request, response }: HttpContext) {
    try {
      const id = request.param('id')

      const serviceType = await ServiceType.findOrFail(id)
      serviceType.is_active = !serviceType.is_active
      await serviceType.save()

      return response.ok({
        message: `Type de service ${serviceType.is_active ? 'activé' : 'désactivé'} avec succès`,
        serviceType: serviceType,
      })
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({
          error_message: 'Type de service non trouvé',
        })
      }
      return response.status(500).send({
        error_message: 'Failed to toggle service type status',
        error: error.message,
      })
    }
  }

  /**
   * @tag ServiceTypes - CRUD
   * @summary Supprimer un type de service
   * @description Supprime un type de service (seulement si aucun service n'y est associé)
   */
  async destroy({ request, response }: HttpContext) {
    try {
      const id = request.param('id')

      // Vérifier qu'aucun service n'est associé à ce type
      const serviceCount = await db
        .from('services')
        .where('service_type_id', id)
        .count('* as count')
        .first()

      if (serviceCount && serviceCount.count > 0) {
        return response.status(400).send({
          error_message: 'Impossible de supprimer ce type car il est utilisé par des services',
        })
      }

      const serviceType = await ServiceType.findOrFail(id)
      await serviceType.delete()

      return response.ok({
        message: 'Type de service supprimé avec succès',
      })
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({
          error_message: 'Type de service non trouvé',
        })
      }
      return response.status(500).send({
        error_message: 'Failed to delete service type',
        error: error.message,
      })
    }
  }

  /**
   * @tag ServiceTypes - Analytics
   * @summary Statistiques des types de services
   * @description Récupère les statistiques des types de services
   */
  async getStats({ response }: HttpContext) {
    try {
      const totalTypes = await db.from('service_types').count('* as total').first()
      const activeTypes = await db
        .from('service_types')
        .where('is_active', true)
        .count('* as total')
        .first()

      const typesWithMostServices = await db
        .from('service_types')
        .leftJoin('services', 'service_types.id', 'services.service_type_id')
        .select('service_types.name', db.raw('COUNT(services.id) as service_count'))
        .groupBy('service_types.id', 'service_types.name')
        .orderBy('service_count', 'desc')
        .limit(5)
      
      return response.ok({ 
        stats: {
          total: totalTypes?.total || 0,
          active: activeTypes?.total || 0,
          inactive: (totalTypes?.total || 0) - (activeTypes?.total || 0),
          top_types: typesWithMostServices,
        },
      })
    } catch (error) {
      return response.status(500).send({
        error_message: 'Failed to fetch service type stats',
        error: error.message,
      })
    }
  }
}
