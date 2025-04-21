import type { HttpContext } from '@adonisjs/core/http'
import { userUpdateValidator } from '#validators/user_put'
import Utilisateurs from '#models/utilisateurs'

export default class UtilisateursController {
  async get({ request, response }: HttpContext) {
    try {
      const user = await Utilisateurs.findOrFail(request.param('id'))
      return response.ok(user)
    } catch (error) {
      return response.notFound({ message: 'Utilisateurs not found' })
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const validatedData = await request.validateUsing(userUpdateValidator)
      const user = await Utilisateurs.findOrFail(request.param('id'))
      user.merge(validatedData)
      await user.save()
      return response.ok({ message: 'Utilisateurs updated successfully', user })
    } catch (error) {
      return response.badRequest({ message: 'Wrong Parametters', error_code: error })
    }
  }
}
