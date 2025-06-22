import type { HttpContext } from '@adonisjs/core/http'
import Admin from '#models/admin'
import Utilisateurs from '#models/utilisateurs'
import Subscription from '#models/subscription'
import Client from '#models/client'
import Livreur from '#models/livreur'
import Commercant from '#models/commercant'
import Prestataire from '#models/prestataire'
import { adminValidator } from '#validators/admin'
import { adminUserCreationValidator } from '#validators/admin_user_creation'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class AdminController {
  async index({ response }: HttpContext) {
    try {
      const admins = await Admin.query().preload('user' as unknown as ExtractModelRelations<Admin>)
      return response.ok(admins)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to fetch admins', error })
    }
  }

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

      await admin.load((('user' as unknown) as ExtractModelRelations<Admin>))
      return response.created(admin)
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
        privileges
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
        state: 'open'
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
                rating: null
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
                contractEndDate: DateTime.now().plus({ years: 1 })
              })
              break
            case 'prestataire':
              await Prestataire.create({
                id: user.id,
                service_type: null,
                rating: null
              })
              break
            case 'administrateur':
              await Admin.create({
                id: user.id,
                privileges: privileges || 'basic'
              })
              break
          }
        }
      }

      // Always create a client role as it's the default
      await Client.create({
        id: user.id,
        loyalty_points: 0,
        preferred_payment_method: null
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
          created_at: fullUser.createdAt
        }
      })
    } catch (error) {
      console.error('Error creating user:', error)
      return response.status(500).send({ error_message: 'Failed to create user', error: error.message })
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

      await admin.load(('user' as unknown) as ExtractModelRelations<Admin>)
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
      const { state } = request.body()

      // Validate state value
      if (!state || !['open', 'closed'].includes(state)) {
        return response.status(400).send({ error_message: 'Invalid state. Must be "open" or "closed"' })
      }

      // Find and update the user
      const user = await Utilisateurs.findOrFail(userId)
      user.state = state
      await user.save()

      return response.ok({ 
        message: 'User status updated successfully', 
        user: {
          id: user.id,
          state: user.state,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        }
      })
    } catch (error) {
      console.error('Error toggling user status:', error)
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({ error_message: 'User not found' })
      }
      return response.status(500).send({ error_message: 'Failed to toggle user status', error: error.message })
    }
  }
}
