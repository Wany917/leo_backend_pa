import type { HttpContext } from '@adonisjs/core/http'
import Livreur from '#models/livreur'
import Utilisateurs from '#models/utilisateurs'
import { livreurValidator } from '#validators/add_livreur'

export default class LivreursController {
  async add({ request, response }: HttpContext) {
    try {
      const { utilisateur_id } = await request.validateUsing(livreurValidator)

      const livreurAlreadyLinked = await Livreur.findBy('id', utilisateur_id)
      if (livreurAlreadyLinked) {
        return response.badRequest({ message: 'Utilisateurs already has a Livreur account' })
      }

      const livreur = await Livreur.create({
        id: utilisateur_id,
        availability_status: 'available',
        rating: null,
      })

      return response.created({
        message: 'Livreur created successfully',
        livreur: livreur.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Invalid data', error_code: error })
    }
  }

  async getProfile({ request, response }: HttpContext) {
    try {
      const client = await Livreur.findOrFail(request.param('id'))
      const user = await Utilisateurs.findOrFail(request.param('id'))
      const { password: _, ...userData } = user.serialize()
      const { id: __, ...clientData } = client.serialize()
      return response.ok({ user: userData, client: clientData })
    } catch (error) {
      return response.notFound({ message: 'Client Profile not found', error_code: error })
    }
  }

  async updateProfile({ request, response }: HttpContext) {
    try {
      const livreur = await Livreur.findOrFail(request.param('id'))
      livreur.merge(request.body())
      await livreur.save()
      const { password: _, ...livreurData } = livreur.serialize()
      return response.ok(livreurData)
    } catch (error) {
      return response.badRequest({ message: 'Wrong Parametters', error_code: error })
    }
  }
}
