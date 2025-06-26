import type { HttpContext } from '@adonisjs/core/http'
import Admin from '#models/admin'
import Utilisateurs from '#models/utilisateurs'
import Subscription from '#models/subscription'
import Client from '#models/client'
import Livreur from '#models/livreur'
import Commercant from '#models/commercant'
import Prestataire from '#models/prestataire'
import Service from '#models/service'
import ServiceType from '#models/service_type'
import { adminValidator } from '#validators/admin'
import { adminUserCreationValidator } from '#validators/admin_user_creation'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class AdminController {
  /**
   * @tag Admin - Gestion
   * @summary Lister tous les administrateurs
   * @description Récupère la liste complète des administrateurs avec leurs informations utilisateur
   */
  async index({ response }: HttpContext) {
    try {
      const admins = await Admin.query().preload('user' as unknown as ExtractModelRelations<Admin>)
      return response.ok(admins)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to fetch admins', error })
    }
  }

  /**
   * @tag Admin - Gestion
   * @summary Créer un nouvel administrateur
   * @description Ajoute les privilèges admin à un utilisateur existant
   */
  async create({ request, response }: HttpContext) {
    try {
      const { id, privileges } = await request.validateUsing(adminValidator)

      // Vérifier si l'utilisateur existe
      const user = await Utilisateurs.find(id)
      if (!user) {
        return response.status(404).send({ error_message: 'User not found' })
      }

      // Vérifier si l'admin existe déjà
      const existingAdmin = await Admin.find(id)
      if (existingAdmin) {
        return response.status(400).send({ error_message: 'User is already an admin' })
      }

      // Créer l'admin
      const admin = await Admin.create({
        id,
        privileges: privileges || 'basic',
      })

      await admin.load('user' as unknown as ExtractModelRelations<Admin>)
      return response.created(admin)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to create admin', error })
    }
  }

  /**
   * @tag Admin - Utilisateurs
   * @summary Créer un utilisateur complet avec rôles
   * @description Crée un nouvel utilisateur avec email et assigne les rôles sélectionnés
   */
  async createUserWithEmail({ request, response }: HttpContext) {
    try {
      const {
        first_name,
        last_name,
        email,
        password,
        phone_number,
        address,
        city,
        postalCode,
        country,
        roles,
        privileges,
      } = await request.validateUsing(adminUserCreationValidator)

      // Check if email already exists
      const existingUser = await Utilisateurs.findBy('email', email.toLowerCase())
      if (existingUser) {
        return response.status(400).send({ error_message: 'This email address is already used' })
      }

      // Create the user
      const user = await Utilisateurs.create({
        first_name,
        last_name,
        email: email.toLowerCase(),
        password,
        phone_number: phone_number || null,
        address: address || null,
        city,
        postalCode,
        country,
        state: 'open',
      })

      // Create subscription for the user
      await Subscription.create({
        utilisateur_id: user.id,
        subscription_type: 'free',
        status: 'active',
        start_date: DateTime.now(),
      })

      // Create roles based on selected roles array
      if (roles && roles.length > 0) {
        for (const role of roles) {
          switch (role) {
            case 'livreur':
              await Livreur.create({
                id: user.id,
                availabilityStatus: 'available',
                rating: null,
              })
              break
            case 'commercant':
              await Commercant.create({
                id: user.id,
                storeName: `${first_name} ${last_name} Store`,
                businessAddress: address || null,
                verificationState: 'pending',
                contactNumber: phone_number || null,
                contractStartDate: DateTime.now(),
                contractEndDate: DateTime.now().plus({ years: 1 }),
              })
              break
            case 'prestataire':
              await Prestataire.create({
                id: user.id,
                service_type: null,
                rating: null,
              })
              break
            case 'administrateur':
              await Admin.create({
                id: user.id,
                privileges: privileges || 'basic',
              })
              break
          }
        }
      }

      // Always create a client role as it's the default
      await Client.create({
        id: user.id,
        loyalty_points: 0,
        preferred_payment_method: null,
      })

      const fullUser = await Utilisateurs.query()
        .where('id', user.id)
        .preload('admin' as unknown as ExtractModelRelations<Utilisateurs>)
        .firstOrFail()

      return response.created({
        message: 'User created successfully',
        user: {
          id: fullUser.id,
          first_name: fullUser.first_name,
          last_name: fullUser.last_name,
          email: fullUser.email,
          phone_number: fullUser.phone_number,
          address: fullUser.address,
          city: fullUser.city,
          postalCode: fullUser.postalCode,
          country: fullUser.country,
          state: fullUser.state,
          admin: fullUser.admin ? fullUser.admin.serialize() : null,
          created_at: fullUser.createdAt,
        },
      })
    } catch (error) {
      console.error('Error creating user:', error)
      return response
        .status(500)
        .send({ error_message: 'Failed to create user', error: error.message })
    }
  }

  async get({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const admin = await Admin.query()
        .where('id', id)
        .preload('user' as unknown as ExtractModelRelations<Admin>)
        .firstOrFail()
      return response.ok(admin)
    } catch (error) {
      return response.status(404).send({ error_message: 'Admin not found' })
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const { privileges } = request.body()

      const admin = await Admin.find(id)
      if (!admin) {
        return response.status(404).send({ error_message: 'Admin not found' })
      }

      admin.privileges = privileges
      await admin.save()

      await admin.load('user' as unknown as ExtractModelRelations<Admin>)
      return response.ok(admin)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to update admin', error })
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const admin = await Admin.find(id)

      if (!admin) {
        return response.status(404).send({ error_message: 'Admin not found' })
      }

      await admin.delete()
      return response.noContent()
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to delete admin', error })
    }
  }

  async toggleUserStatus({ request, response }: HttpContext) {
    try {
      const userId = request.param('id')

      // Find and update the user
      const user = await Utilisateurs.findOrFail(userId)

      // Basculer automatiquement le statut
      const newState = user.state === 'open' ? 'closed' : 'open'
      user.state = newState
      await user.save()

      return response.ok({
        message: `User status updated successfully to ${newState}`,
        user: {
          id: user.id,
          state: user.state,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      })
    } catch (error) {
      console.error('Error toggling user status:', error)
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({ error_message: 'User not found' })
      }
      return response
        .status(500)
        .send({ error_message: 'Failed to toggle user status', error: error.message })
    }
  }

  /**
   * Supprimer complètement un utilisateur et toutes ses relations
   */
  async deleteUser({ request, response }: HttpContext) {
    try {
      const userId = request.param('id')

      // Vérifier que l'utilisateur existe
      const user = await Utilisateurs.findOrFail(userId)

      console.log(`🗑️ Admin Controller - Suppression utilisateur ID: ${userId}`)

      // Supprimer toutes les relations en premier (pour éviter les contraintes FK)
      // Note: AdonisJS gère automatiquement les suppressions en cascade si configuré
      try {
        await Admin.query().where('id', userId).delete()
      } catch (e) {
        /* L'admin peut ne pas exister */
      }

      try {
        await Client.query().where('id', userId).delete()
      } catch (e) {
        /* Le client peut ne pas exister */
      }

      try {
        await Livreur.query().where('id', userId).delete()
      } catch (e) {
        /* Le livreur peut ne pas exister */
      }

      try {
        await Prestataire.query().where('id', userId).delete()
      } catch (e) {
        /* Le prestataire peut ne pas exister */
      }

      try {
        await Commercant.query().where('id', userId).delete()
      } catch (e) {
        /* Le commercant peut ne pas exister */
      }

      try {
        await Subscription.query().where('utilisateur_id', userId).delete()
      } catch (e) {
        /* L'abonnement peut ne pas exister */
      }

      // Supprimer l'utilisateur principal en dernier
      await user.delete()

      console.log(`✅ Admin Controller - Utilisateur ${userId} supprimé avec succès`)

      return response.ok({
        message: 'User deleted successfully',
        deleted_user_id: userId,
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({ error_message: 'User not found' })
      }
      return response
        .status(500)
        .send({ error_message: 'Failed to delete user', error: error.message })
    }
  }

  /**
   * @tag Admin - Services Dashboard
   * @summary Dashboard analytics des services
   * @description Stats générales, Top 5 prestations et analytics conformes au cahier des charges page 8
   */
  async getServicesDashboard({ response }: HttpContext) {
    try {
      // Stats générales services
      const totalServices = await Service.query().count('* as total')
      const activeServices = await Service.query().where('is_active', true).count('* as total')
      const completedServices = await Service.query()
        .where('status', 'completed')
        .count('* as total')
      const pendingServices = await Service.query().where('status', 'scheduled').count('* as total')

      // Top 5 des prestations les plus demandées (requis cahier des charges)
      const topServices = await db
        .from('services')
        .join('service_types', 'services.service_type_id', 'service_types.id')
        .select('service_types.name', 'services.name as service_name')
        .count('* as demand_count')
        .avg('services.price as avg_price')
        .groupBy('service_types.name', 'services.name')
        .orderBy('demand_count', 'desc')
        .limit(5)

      // Top 5 prestataires les plus actifs
      const topProviders = await db
        .from('services')
        .join('prestataires', 'services.prestataireId', 'prestataires.id')
        .join('utilisateurs', 'prestataires.id', 'utilisateurs.id')
        .select(
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'prestataires.rating'
        )
        .count('* as services_count')
        .sum('services.price as total_revenue')
        .groupBy(
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'prestataires.rating'
        )
        .orderBy('services_count', 'desc')
        .limit(5)

      // Répartition par type de service
      const servicesByType = await db
        .from('services')
        .join('service_types', 'services.service_type_id', 'service_types.id')
        .select('service_types.name as type_name')
        .count('* as count')
        .avg('services.price as avg_price')
        .groupBy('service_types.name')
        .orderBy('count', 'desc')

      // Statistiques financières mensuelles
      const monthlyRevenue = await db
        .from('services')
        .where('status', 'completed')
        .select(
          db.raw('EXTRACT(MONTH FROM start_date) as month'),
          db.raw('EXTRACT(YEAR FROM start_date) as year')
        )
        .sum('price as revenue')
        .count('* as services_count')
        .groupBy(db.raw('EXTRACT(MONTH FROM start_date), EXTRACT(YEAR FROM start_date)'))
        .orderBy('year', 'desc')
        .orderBy('month', 'desc')
        .limit(6)

      return response.ok({
        dashboard_stats: {
          total_services: totalServices[0].$extras.total,
          active_services: activeServices[0].$extras.total,
          completed_services: completedServices[0].$extras.total,
          pending_services: pendingServices[0].$extras.total,
          completion_rate:
            totalServices[0].$extras.total > 0
              ? (
                  (completedServices[0].$extras.total / totalServices[0].$extras.total) *
                  100
                ).toFixed(1)
              : 0,
        },
        top_services: topServices,
        top_providers: topProviders,
        services_by_type: servicesByType,
        monthly_revenue: monthlyRevenue,
        generated_at: DateTime.now().toISO(),
      })
    } catch (error) {
      console.error('Admin services dashboard error:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch services dashboard',
        error: error.message,
      })
    }
  }

  /**
   * @tag Admin - Validation Prestataires
   * @summary Validation d'un prestataire par l'admin
   * @description Approuve/rejette un prestataire conforme au cahier des charges page 6
   */
  async validatePrestataire({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('id')
      const { validation_status, admin_comments, verified_qualifications } = request.body()

      if (!['approved', 'rejected', 'pending'].includes(validation_status)) {
        return response.status(400).send({
          error_message: 'Invalid validation status. Must be: approved, rejected, or pending',
        })
      }

      // Vérifier que le prestataire existe
      const prestataire = await Prestataire.findOrFail(prestataireId)
      const user = await Utilisateurs.findOrFail(prestataireId)

      // Mise à jour du statut du prestataire
      const updateData: any = {
        updatedAt: DateTime.now(),
      }

      if (validation_status === 'approved') {
        // Activer le compte utilisateur si approuvé
        user.state = 'open'
        await user.save()

        // Activer tous les services du prestataire
        await Service.query()
          .where('prestataireId', prestataireId)
          .update({ is_active: true, status: 'scheduled' })
      } else if (validation_status === 'rejected') {
        // Suspendre le compte
        user.state = 'closed'
        await user.save()

        // Désactiver tous les services du prestataire
        await Service.query()
          .where('prestataireId', prestataireId)
          .update({ is_active: false, status: 'cancelled' })
      }

      await prestataire.save()

      return response.ok({
        message: `Prestataire ${validation_status} successfully`,
        prestataire: {
          id: prestataire.id,
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            state: user.state,
          },
          service_type: prestataire.service_type,
          rating: prestataire.rating,
        },
        admin_comments: admin_comments || null,
        verified_qualifications: verified_qualifications || [],
      })
    } catch (error) {
      console.error('Prestataire validation error:', error)
      return response.status(500).send({
        error_message: 'Failed to validate prestataire',
        error: error.message,
      })
    }
  }

  /**
   * Génération de la facturation mensuelle automatique
   * Conforme au cahier des charges page 6 : "facturation automatique mensuelle"
   */
  async generateFacturationMensuelle({ request, response }: HttpContext) {
    try {
      const { month, year } = request.qs()
      const targetMonth = month || DateTime.now().month
      const targetYear = year || DateTime.now().year

      // Calculer les dates de début et fin du mois
      const startOfMonth = DateTime.fromObject({
        year: Number.parseInt(targetYear),
        month: Number.parseInt(targetMonth),
        day: 1,
      })
      const endOfMonth = startOfMonth.endOf('month')

      // Récupérer tous les services complétés du mois
      const completedServices = await db
        .from('services')
        .join('prestataires', 'services.prestataireId', 'prestataires.id')
        .join('utilisateurs', 'prestataires.id', 'utilisateurs.id')
        .where('services.status', 'completed')
        .whereBetween('services.start_date', [startOfMonth.toSQL(), endOfMonth.toSQL()])
        .select(
          'services.prestataireId',
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'services.name as service_name',
          'services.price',
          'services.start_date',
          'services.id as service_id'
        )

      // Grouper par prestataire pour créer les factures
      const facturesByPrestataire = {}
      completedServices.forEach((service) => {
        const prestataireId = service.prestataireId
        if (!facturesByPrestataire[prestataireId]) {
          facturesByPrestataire[prestataireId] = {
            prestataire: {
              id: prestataireId,
              first_name: service.first_name,
              last_name: service.last_name,
              email: service.email,
            },
            services: [],
            total_amount: 0,
            service_count: 0,
          }
        }

        // Calculer la commission EcoDeli (ex: 15%)
        const commissionRate = 0.15
        const prestataireAmount = service.price * (1 - commissionRate)

        facturesByPrestataire[prestataireId].services.push({
          service_id: service.service_id,
          service_name: service.service_name,
          original_price: service.price,
          commission_rate: commissionRate,
          prestataire_amount: prestataireAmount,
          service_date: service.start_date,
        })

        facturesByPrestataire[prestataireId].total_amount += prestataireAmount
        facturesByPrestataire[prestataireId].service_count += 1
      })

      // Transformer en array
      const factures = Object.values(facturesByPrestataire)

      return response.ok({
        facturation_period: {
          month: Number.parseInt(targetMonth),
          year: Number.parseInt(targetYear),
          start_date: startOfMonth.toISODate(),
          end_date: endOfMonth.toISODate(),
        },
        factures_generated: factures.length,
        total_services: completedServices.length,
        factures: factures.map((facture) => ({
          ...facture,
          facture_number: `ECO-${targetYear}${targetMonth.toString().padStart(2, '0')}-${facture.prestataire.id}`,
          generated_at: DateTime.now().toISO(),
          due_date: DateTime.now().plus({ days: 30 }).toISODate(),
        })),
      })
    } catch (error) {
      console.error('Monthly billing generation error:', error)
      return response.status(500).send({
        error_message: 'Failed to generate monthly billing',
        error: error.message,
      })
    }
  }

  /**
   * Gestion des types de services
   */
  async getServiceTypes({ response }: HttpContext) {
    try {
      const serviceTypes = await ServiceType.query().orderBy('name', 'asc')

      // Ajouter le nombre de services par type
      const typesWithStats = await Promise.all(
        serviceTypes.map(async (type) => {
          const serviceCount = await Service.query()
            .where('service_type_id', type.id)
            .count('* as total')

          return {
            ...type.serialize(),
            service_count: serviceCount[0].$extras.total,
          }
        })
      )

      return response.ok({
        service_types: typesWithStats,
        total_types: typesWithStats.length,
      })
    } catch (error) {
      console.error('Get service types error:', error)
      return response.status(500).send({
        error_message: 'Failed to fetch service types',
        error: error.message,
      })
    }
  }

  /**
   * Activation/désactivation d'un type de service
   */
  async toggleServiceType({ request, response }: HttpContext) {
    try {
      const typeId = request.param('id')
      const serviceType = await ServiceType.findOrFail(typeId)

      // Inverser le statut
      serviceType.is_active = !serviceType.is_active
      await serviceType.save()

      // Si désactivé, désactiver aussi tous les services de ce type
      if (!serviceType.is_active) {
        await Service.query().where('service_type_id', typeId).update({ is_active: false })
      }

      return response.ok({
        message: `Service type ${serviceType.is_active ? 'activated' : 'deactivated'} successfully`,
        service_type: serviceType.serialize(),
      })
    } catch (error) {
      console.error('Toggle service type error:', error)
      return response.status(500).send({
        error_message: 'Failed to toggle service type',
        error: error.message,
      })
    }
  }
}
