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
import { adminValidator, validatePrestataireValidator } from '#validators/admin'
import { adminUserCreationValidator } from '#validators/admin_user_creation'

import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class AdminController {

  async index({ response }: HttpContext) {
    try {

      const admins = await db
        .from('admins')
        .join('utilisateurs', 'admins.id', 'utilisateurs.id')
        .select(
          'admins.*',
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'utilisateurs.state'
        )
      return response.ok(admins)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to fetch admins', error })
    }
  }


  async create({ request, response }: HttpContext) {
    try {
      const { id, privileges } = await request.validateUsing(adminValidator)


      const user = await Utilisateurs.find(id)
      if (!user) {
        return response.status(404).send({ error_message: 'User not found' })
      }


      const existingAdmin = await Admin.find(id)
      if (existingAdmin) {
        return response.status(400).send({ error_message: 'User is already an admin' })
      }


      const admin = await Admin.create({
        id,
        privileges,
      })


      const adminWithUser = await db
        .from('admins')
        .join('utilisateurs', 'admins.id', 'utilisateurs.id')
        .select(
          'admins.*',
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'utilisateurs.state'
        )
        .where('admins.id', admin.id)
        .first()

      return response.created(adminWithUser)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to create admin', error })
    }
  }


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


      const existingUser = await Utilisateurs.findBy('email', email.toLowerCase())
      if (existingUser) {
        return response.status(400).send({ error_message: 'This email address is already used' })
      }


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


      await Subscription.create({
        utilisateur_id: user.id,
        subscription_type: 'free',
        status: 'active',
        start_date: DateTime.now(),
      })


      if (roles && roles.length > 0) {
        for (const role of roles) {
          switch (role) {
            case 'livreur':
              await Livreur.create({
                id: user.id,
              })
              break
            case 'commercant':
              await Commercant.create({
                id: user.id,
                storeName: `${first_name} ${last_name} Store`,
                businessAddress: address || null,
                verificationState: 'pending',
                contactNumber: phone_number || null,
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


      await Client.create({
        id: user.id,
        loyalty_points: 0,
        preferred_payment_method: null,
      })


      const fullUser = await db
        .from('utilisateurs')
        .leftJoin('admins', 'utilisateurs.id', 'admins.id')
        .select('utilisateurs.*', 'admins.privileges')
        .where('utilisateurs.id', user.id)
        .first()

      return response.created({
        message: 'User created successfully',
        user: {
          id: fullUser?.id || user.id,
          first_name: fullUser?.first_name || user.first_name,
          last_name: fullUser?.last_name || user.last_name,
          email: fullUser?.email || user.email,
          phone_number: fullUser?.phone_number || user.phone_number,
          address: fullUser?.address || user.address,
          city: fullUser?.city || user.city,
          postalCode: fullUser?.postalCode || user.postalCode,
          country: fullUser?.country || user.country,
          state: fullUser?.state || user.state,
          admin: fullUser?.privileges ? { privileges: fullUser.privileges } : null,
          created_at: fullUser?.createdAt || user.createdAt,
        },
      })
    } catch (error) {

      return response
        .status(500)
        .send({ error_message: 'Failed to create user', error: error.message })
    }
  }

  async get({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const admin = await db
        .from('admins')
        .join('utilisateurs', 'admins.id', 'utilisateurs.id')
        .select(
          'admins.*',
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'utilisateurs.state'
        )
        .where('admins.id', id)
        .first()

      if (!admin) {
        return response.status(404).send({ error_message: 'Admin not found' })
      }

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


      const adminWithUser = await db
        .from('admins')
        .join('utilisateurs', 'admins.id', 'utilisateurs.id')
        .select(
          'admins.*',
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'utilisateurs.state'
        )
        .where('admins.id', admin.id)
        .first()

      return response.ok(adminWithUser)
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


      const user = await Utilisateurs.findOrFail(userId)


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

      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({ error_message: 'User not found' })
      }
      return response
        .status(500)
        .send({ error_message: 'Failed to toggle user status', error: error.message })
    }
  }


  async deleteUser({ request, response }: HttpContext) {
    try {
      const userId = request.param('id')


      const user = await Utilisateurs.findOrFail(userId)




      try {
        await Admin.query().where('id', userId).delete()
      } catch (e) {

      }

      try {
        await Client.query().where('id', userId).delete()
      } catch (e) {

      }

      try {
        await Livreur.query().where('id', userId).delete()
      } catch (e) {

      }

      try {
        await Prestataire.query().where('id', userId).delete()
      } catch (e) {

      }

      try {
        await Commercant.query().where('id', userId).delete()
      } catch (e) {

      }

      try {
        await Subscription.query().where('utilisateur_id', userId).delete()
      } catch (e) {

      }


      await user.delete()



      return response.ok({
        message: 'User deleted successfully',
        deleted_user_id: userId,
      })
    } catch (error) {

      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({ error_message: 'User not found' })
      }
      return response
        .status(500)
        .send({ error_message: 'Failed to delete user', error: error.message })
    }
  }


  async getServicesDashboard({ response }: HttpContext) {
    try {

      const totalServices = await Service.query().count('* as total')
      const activeServices = await Service.query().where('is_active', true).count('* as total')
      const completedServices = await Service.query()
        .where('status', 'completed')
        .count('* as total')
      const pendingServices = await Service.query().where('status', 'scheduled').count('* as total')


      const topServices = await db
        .from('services')
        .join('service_types', 'services.service_type_id', 'service_types.id')
        .select('service_types.name', 'services.name as service_name')
        .count('* as demand_count')
        .avg('services.price as avg_price')
        .groupBy('service_types.name', 'services.name')
        .orderBy('demand_count', 'desc')
        .limit(5)


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


      const servicesByType = await db
        .from('services')
        .join('service_types', 'services.service_type_id', 'service_types.id')
        .select('service_types.name as type_name')
        .count('* as count')
        .avg('services.price as avg_price')
        .groupBy('service_types.name')
        .orderBy('count', 'desc')


      const monthlyRevenue = await db
        .from('services')
        .where('status', 'completed')
        .sum('price as revenue')
        .count('* as services_count')
        .first()

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
        monthly_revenue: monthlyRevenue?.revenue || 0,
        generated_at: DateTime.now().toISO(),
      })
    } catch (error) {

      return response.status(500).send({
        error_message: 'Failed to fetch services dashboard',
        error: error.message,
      })
    }
  }


  async validatePrestataire({ request, response }: HttpContext) {
    try {
      const prestataireId = request.param('id')
      const { validation_status, admin_comments } = await request.validateUsing(
        validatePrestataireValidator
      )


      const prestataire = await Prestataire.findOrFail(prestataireId)
      const user = await Utilisateurs.findOrFail(prestataireId)

      if (validation_status === 'approved') {

        user.state = 'open'
        await user.save()


        await Service.query()
          .where('prestataireId', prestataireId)
          .update({ is_active: true, status: 'scheduled' })
      } else if (validation_status === 'rejected') {

        user.state = 'closed'
        await user.save()


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
      })
    } catch (error) {

      return response.status(500).send({
        error_message: 'Failed to validate prestataire',
        error: error.message,
      })
    }
  }


  async generateFacturationMensuelle({ request, response }: HttpContext) {
    try {
      const { month, year } = request.qs()
      const targetMonth = month || DateTime.now().month
      const targetYear = year || DateTime.now().year


      const startOfMonth = DateTime.fromObject({
        year: Number.parseInt(targetYear),
        month: Number.parseInt(targetMonth),
        day: 1,
      })
      const endOfMonth = startOfMonth.endOf('month')


      const completedServices = await db
        .from('services')
        .join('prestataires', 'services.prestataireId', 'prestataires.id')
        .join('utilisateurs', 'prestataires.id', 'utilisateurs.id')
        .where('services.status', 'completed')
        .whereBetween('services.start_date', [
          startOfMonth.toFormat('yyyy-MM-dd'),
          endOfMonth.toFormat('yyyy-MM-dd'),
        ])
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


      interface FactureData {
        prestataire: {
          id: number
          first_name: string
          last_name: string
          email: string
        }
        services: Array<{
          service_id: number
          service_name: string
          original_price: number
          commission_rate: number
          prestataire_amount: number
          service_date: string
        }>
        total_amount: number
        service_count: number
      }


      const facturesByPrestataire: Record<number, FactureData> = {}
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

      return response.status(500).send({
        error_message: 'Failed to generate monthly billing',
        error: error.message,
      })
    }
  }


  async getServiceTypes({ response }: HttpContext) {
    try {
      const serviceTypes = await ServiceType.query().orderBy('name', 'asc')


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

      return response.status(500).send({
        error_message: 'Failed to fetch service types',
        error: error.message,
      })
    }
  }


  async toggleServiceType({ request, response }: HttpContext) {
    try {
      const typeId = request.param('id')
      const serviceType = await ServiceType.findOrFail(typeId)


      serviceType.is_active = !serviceType.is_active
      await serviceType.save()


      if (!serviceType.is_active) {
        await Service.query().where('service_type_id', typeId).update({ is_active: false })
      }

      return response.ok({
        message: `Service type ${serviceType.is_active ? 'activated' : 'deactivated'} successfully`,
        service_type: serviceType.serialize(),
      })
    } catch (error) {

      return response.status(500).send({
        error_message: 'Failed to toggle service type',
        error: error.message,
      })
    }
  }
}
