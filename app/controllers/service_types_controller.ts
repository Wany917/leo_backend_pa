import type { HttpContext } from '@adonisjs/core/http'
import ServiceType from '#models/service_type'

export default class ServiceTypesController {
  /**
   * Display a list of service types
   */
  async index({ response }: HttpContext) {
    try {
      const serviceTypes = await ServiceType.query().orderBy('name', 'asc')
      return response.ok({ serviceTypes })
    } catch (error) {
      return response.badRequest({ message: 'Failed to fetch service types', error: error.message })
    }
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    try {
      const { name, description, is_active } = request.body()
      
      const serviceType = await ServiceType.create({
        name,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
      })

      return response.created({ serviceType, message: 'Service type created successfully' })
    } catch (error) {
      return response.badRequest({ message: 'Failed to create service type', error: error.message })
    }
  }

  /**
   * Show individual service type
   */
  async show({ params, response }: HttpContext) {
    try {
      const serviceType = await ServiceType.findOrFail(params.id)
      return response.ok({ serviceType })
    } catch (error) {
      return response.notFound({ message: 'Service type not found' })
    }
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const serviceType = await ServiceType.findOrFail(params.id)
      const { name, description, is_active } = request.body()

      serviceType.merge({
        name: name || serviceType.name,
        description: description !== undefined ? description : serviceType.description,
        is_active: is_active !== undefined ? is_active : serviceType.is_active,
      })

      await serviceType.save()
      return response.ok({ serviceType, message: 'Service type updated successfully' })
    } catch (error) {
      return response.badRequest({ message: 'Failed to update service type', error: error.message })
    }
  }

  /**
   * Delete a service type
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const serviceType = await ServiceType.findOrFail(params.id)
      await serviceType.delete()
      return response.ok({ message: 'Service type deleted successfully' })
    } catch (error) {
      return response.badRequest({ message: 'Failed to delete service type', error: error.message })
    }
  }

  /**
   * Toggle active status of a service type
   */
  async toggleStatus({ params, response }: HttpContext) {
    try {
      const serviceType = await ServiceType.findOrFail(params.id)
      serviceType.is_active = !serviceType.is_active
      await serviceType.save()
      
      return response.ok({ 
        serviceType, 
        message: `Service type ${serviceType.is_active ? 'activated' : 'deactivated'} successfully` 
      })
    } catch (error) {
      return response.badRequest({ message: 'Failed to toggle service type status', error: error.message })
    }
  }
}