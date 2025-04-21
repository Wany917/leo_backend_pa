import type { HttpContext } from '@adonisjs/core/http'
import Commercant from '#models/commercant'
import Utilisateurs from '#models/utilisateurs'
import { commercantValidator } from '#validators/add_commercant'
import { DateTime } from 'luxon'

export default class CommercantsController {
  async add({ request, response }: HttpContext) {
    try {
      const {
        user_id,
        store_name,
        business_address,
        contact_number,
        contract_start_date,
        contract_end_date,
      } = await request.validateUsing(commercantValidator)

      const commercantAlreadyLinked = await Commercant.findBy('id', user_id)
      if (commercantAlreadyLinked) {
        return response.badRequest({ message: 'Utilisateurs already has a Commercant account' })
      }

      const commercant = await Commercant.create({
        id: user_id,
        store_name: store_name,
        business_address: business_address,
        contact_number: contact_number || null,
        contract_start_date: DateTime.fromJSDate(contract_start_date),
        contract_end_date: DateTime.fromJSDate(contract_end_date),
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
      const { password: _, ...userData } = user.serialize()
      const { id: __, ...commercantData } = commercant.serialize()
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
      const { password: _, ...commercantData } = commercant.serialize()
      return response.ok(commercantData)
    } catch (error) {
      return response.badRequest({ message: 'Wrong Parametters', error_code: error })
    }
  }
}
