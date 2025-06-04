import type { HttpContext } from '@adonisjs/core/http'
import Service from '#models/service'
import { DateTime } from 'luxon'

export default class ServicesController {
  /**
   * Liste tous les services disponibles
   */
  async index({ response }: HttpContext) {
    try {
      const services = await Service.query().orderBy('name', 'asc')
      return response.ok({ services: services.map((service) => service.serialize()) })
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to fetch services', error })
    }
  }

  /**
   * Crée un nouveau service
   */
  async create({ request, response }: HttpContext) {
    try {
      const { name, description, price, start_date, end_date } = request.body()

      const service = await Service.create({
        name,
        description,
        price,
        start_date: start_date || null,
        end_date: end_date || null,
      })

      return response.created({ service: service.serialize() })
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to create service', error })
    }
  }

  /**
   * Récupère un service spécifique
   */
  async show({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const service = await Service.findOrFail(id)

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
      const { name, description, price } = request.body()

      const service = await Service.findOrFail(id)

      service.merge({
        name: name || service.name,
        description: description || service.description,
        price: price || service.price,
        updatedAt: DateTime.now(),
      })

      await service.save()

      return response.ok({ service: service.serialize() })
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to update service', error })
    }
  }

  /**
   * Supprime un service
   */
  async delete({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const service = await Service.findOrFail(id)

      await service.delete()

      return response.noContent()
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to delete service', error })
    }
  }
}
