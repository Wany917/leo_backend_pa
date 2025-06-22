import type { HttpContext } from '@adonisjs/core/http'
import Service from '#models/service'
import { DateTime } from 'luxon'
import { serviceValidator } from '#validators/create_service'


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
      const {
        name,
        description,
        price,
        service_type_id,
        prestataireId,
        clientId,
        location,
        start_date,
        end_date,
        status,
      } = await request.validateUsing(serviceValidator)

      // Validate and parse datetime fields
      let parsedStartDate: DateTime | undefined
      let parsedEndDate: DateTime | undefined

      if (start_date) {
        parsedStartDate = DateTime.fromISO(start_date)
        if (!parsedStartDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid start_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: start_date,
          })
        }
      }

      if (end_date) {
        parsedEndDate = DateTime.fromISO(end_date)
        if (!parsedEndDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid end_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: end_date,
          })
        }
      }

      // Validate that end_date is after start_date
      if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
        return response.status(400).send({
          error_message: 'End date must be after start date',
        })
      }

      // Validate required fields
      if (!name || !description || !price || !location || !start_date || !end_date) {
        return response.status(400).send({
          error_message: 'Missing required fields: name, description, price, location, start_date, end_date are required'
        })
      }

      // Validate price is a positive number
      if (isNaN(price) || price <= 0) {
        return response.status(400).send({
          error_message: 'Price must be a positive number'
        })
      }

      // Validate prestataireId is a valid number if provided
      if (prestataireId !== undefined && (isNaN(prestataireId) || prestataireId <= 0)) {
        return response.status(400).send({
          error_message: 'prestataireId must be a valid positive number'
        })
      }

      // Validate clientId is a valid number if provided
      if (clientId !== undefined && (isNaN(clientId) || clientId <= 0)) {
        return response.status(400).send({
          error_message: 'clientId must be a valid positive number'
        })
      }

      const service = await Service.create({
        name,
        description,
        price: parseFloat(price.toString()),
        service_type_id: service_type_id || null,
        prestataireId: prestataireId ? parseInt(prestataireId.toString()) : undefined,
        clientId: clientId ? parseInt(clientId.toString()) : undefined,
        location,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        status: status || 'scheduled',
        isActive: true,
      })

      return response.created({ service: service.serialize() })
    } catch (error) {
      console.error('Service creation error:', error)

      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') {
        return response.status(400).send({ 
          error_message: 'Invalid prestataireId: The specified service provider does not exist' 
        })
      }

      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        return response.status(400).send({ 
          error_message: 'A service with this name already exists for this provider' 
        })
      }

      return response.status(500).send({ 
        error_message: 'Failed to create service', 
        details: error.message 
      })
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
      const {
        name,
        description,
        price,
        duration,
        service_type_id,
        isActive,
        prestataireId,
        location,
        start_date,
        end_date,
        status,
      } = request.body()

      const service = await Service.findOrFail(id)

      // Validate and parse datetime fields if provided
      let parsedStartDate: DateTime | undefined = service.start_date
      let parsedEndDate: DateTime | undefined = service.end_date

      if (start_date) {
        parsedStartDate = DateTime.fromISO(start_date)
        if (!parsedStartDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid start_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: start_date,
          })
        }
      }

      if (end_date) {
        parsedEndDate = DateTime.fromISO(end_date)
        if (!parsedEndDate.isValid) {
          return response.status(400).send({
            error_message:
              'Invalid end_date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss)',
            received: end_date,
          })
        }
      }

      // Validate that end_date is after start_date
      if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
        return response.status(400).send({
          error_message: 'End date must be after start date',
        })
      }

      // Validate price if provided
      if (price !== undefined && (isNaN(price) || price <= 0)) {
        return response.status(400).send({
          error_message: 'Price must be a positive number'
        })
      }

      // Validate prestataireId if provided
      if (prestataireId !== undefined && (isNaN(prestataireId) || prestataireId <= 0)) {
        return response.status(400).send({
          error_message: 'prestataireId must be a valid positive number'
        })
      }

      service.merge({
        name: name || service.name,
        description: description || service.description,
        price: price ? parseFloat(price) : service.price,
        service_type_id: service_type_id !== undefined ? service_type_id : service.service_type_id,
        isActive: isActive !== undefined ? isActive : service.isActive,
        prestataireId: prestataireId ? parseInt(prestataireId) : service.prestataireId,
        location: location || service.location,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        duration: duration !== undefined ? duration : service.duration,
        status: status || service.status,
        updatedAt: DateTime.now(),
      })

      await service.save()

      return response.ok({ service: service.serialize() })
    } catch (error) {
      console.error('Service update error:', error)
      
      // Handle specific database errors
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') {
        return response.status(400).send({ 
          error_message: 'Invalid prestataireId: The specified service provider does not exist' 
        })
      }
      
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        return response.status(400).send({ 
          error_message: 'A service with this name already exists for this provider' 
        })
      }
      
      return response.status(500).send({ 
        error_message: 'Failed to update service', 
        details: error.message 
      })
    }
  }

  /**
   * Supprime un service
   */
  async delete({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      
      // Validate ID is a valid number
      if (isNaN(id) || id <= 0) {
        return response.status(400).send({
          error_message: 'Invalid service ID: must be a positive number'
        })
      }
      
      const service = await Service.findOrFail(id)

      await service.delete()

      return response.noContent()
    } catch (error) {
      console.error('Service deletion error:', error)
      
      // Handle service not found
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).send({ 
          error_message: 'Service not found' 
        })
      }
      
      // Handle foreign key constraint errors
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23503') {
        return response.status(400).send({ 
          error_message: 'Cannot delete service: it is referenced by other records' 
        })
      }
      
      return response.status(500).send({ 
        error_message: 'Failed to delete service', 
        details: error.message 
      })
    }
  }
}
