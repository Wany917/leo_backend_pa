import type { HttpContext } from '@adonisjs/core/http'
import Commercant from '#models/commercant'
import Utilisateurs from '#models/utilisateurs'
import { commercantValidator } from '#validators/add_commercant'
import { DateTime } from 'luxon'

export default class CommercantsController {
  async add({ request, response }: HttpContext) {
    try {
      const { utilisateur_id, store_name, business_address } =
        await request.validateUsing(commercantValidator)

      const commercantAlreadyLinked = await Commercant.find(utilisateur_id)
      if (commercantAlreadyLinked) {
        return response.badRequest({ message: 'Utilisateur already has a Commercant account' })
      }

      const commercant = await Commercant.create({
        id: utilisateur_id,
        storeName: store_name,
        businessAddress: business_address || null,
        verificationState: 'pending',
      })

      return response.created({
        message: 'Commercant created successfully',
        commercant: commercant.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Invalid data', error_code: error })
    }
  }

  async getProfile({ request, response }: HttpContext) {
    try {
      const commercant = await Commercant.findOrFail(request.param('id'))
      const user = await Utilisateurs.findOrFail(request.param('id'))
      const userData = user.serialize()
      const { id, ...commercantData } = commercant.serialize()
      return response.ok({ user: userData, commercant: commercantData })
    } catch (error) {
      return response.notFound({ message: 'Commercant Profile not found', error_code: error })
    }
  }

  async updateProfile({ request, response }: HttpContext) {
    try {
      const commercant = await Commercant.findOrFail(request.param('id'))
      commercant.merge(request.body())
      await commercant.save()
      const { password, ...commercantData } = commercant.serialize()
      return response.ok(commercantData)
    } catch (error) {
      return response.badRequest({ message: 'Wrong Parameters', error_code: error })
    }
  }

  async verify({ request, response }: HttpContext) {
    try {
      const commercant = await Commercant.findOrFail(request.param('id'))
      commercant.verificationState = 'verified'
      await commercant.save()
      return response.ok({
        message: 'Commercant verified successfully',
        commercant: commercant.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Error verifying commercant', error_code: error })
    }
  }

  async reject({ request, response }: HttpContext) {
    try {
      const commercant = await Commercant.findOrFail(request.param('id'))
      commercant.verificationState = 'rejected'
      await commercant.save()
      return response.ok({
        message: 'Commercant rejected successfully',
        commercant: commercant.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Error rejecting commercant', error_code: error })
    }
  }

  async getUnverified({ response }: HttpContext) {
    try {
      const commercants = await Commercant.query()
        .where('verification_state', 'pending')
        .preload('user')

      console.log('🏪 [BACKEND] Commerçants trouvés:', commercants.length)
      if (commercants.length > 0) {
        console.log('🔍 [BACKEND] Premier commerçant brut:', {
          id: commercants[0].id,
          storeName: commercants[0].storeName,
          user: commercants[0].user,
          user_loaded: !!commercants[0].user,
        })

        const serialized = commercants.map((commercant) => {
          const commercantData = commercant.serialize()

          // Ajouter manuellement first_name et last_name si l'utilisateur existe
          if (commercantData.user) {
            commercantData.user.first_name = commercantData.user.firstName
            commercantData.user.last_name = commercantData.user.lastName
          }

          return commercantData
        })
        console.log('📦 [BACKEND] Premier commerçant sérialisé:', serialized[0])

        return response.ok({ commercants: serialized })
      }

      return response.ok({ commercants: [] })
    } catch (error) {
      console.error('❌ [BACKEND] Erreur getUnverified:', error)
      return response.badRequest({ message: 'Error fetching unverified commercants', error: error })
    }
  }

  async getVerified({ response }: HttpContext) {
    try {
      const commercants = await Commercant.query()
        .where('verification_state', 'verified')
        .preload('user')

      console.log('🏪 [BACKEND] Commerçants vérifiés trouvés:', commercants.length)
      if (commercants.length > 0) {
        console.log('🔍 [BACKEND] Premier commerçant vérifié brut:', {
          id: commercants[0].id,
          storeName: commercants[0].storeName,
          user: commercants[0].user,
          user_loaded: !!commercants[0].user,
        })

        const serialized = commercants.map((commercant) => {
          const commercantData = commercant.serialize()

          // Ajouter manuellement first_name et last_name si l'utilisateur existe
          if (commercantData.user) {
            commercantData.user.first_name = commercantData.user.firstName
            commercantData.user.last_name = commercantData.user.lastName
          }

          return commercantData
        })
        console.log('📦 [BACKEND] Premier commerçant vérifié sérialisé:', serialized[0])

        return response.ok({ commercants: serialized })
      }

      return response.ok({ commercants: [] })
    } catch (error) {
      console.error('❌ [BACKEND] Erreur getVerified:', error)
      return response.badRequest({ message: 'Error fetching verified commercants', error: error })
    }
  }
}
