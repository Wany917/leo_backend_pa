import type { HttpContext } from '@adonisjs/core/http'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import { colisValidator } from '#validators/create_coli'

export default class ColisController {
    async create({ request, response }: HttpContext) {
        try {
            const { annonce_id, weight, length, width, height, content_description } = await request.validateUsing(colisValidator)
            
            const annonce = await Annonce.findOrFail(annonce_id)
            if (!annonce) {
                return response.badRequest({ message: 'Annonce not found' })
            }
            
            if (weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
                return response.badRequest({ message: 'Dimensions and weight must be positive numbers' })
            }
            
            let tracking_number = `COLIS-${Math.floor(Math.random() * 1000000)}`
            while (await Colis.findBy('tracking_number', tracking_number)) {
                tracking_number = `COLIS-${Math.floor(Math.random() * 1000000)}`
            }
            const colis = await Colis.create({
                annonce_id: annonce_id,
                tracking_number: tracking_number,
                weight: weight,
                length: length,
                width: width,
                height: height,
                content_description: content_description,
                status: 'stored'
            })
            return response.created({ message: 'Colis created successfully', colis: colis.serialize() })
        } catch (error) {
            return response.badRequest({ message: 'Invalid data', error_code: error })
        }
    }

    async getColis({ request, response }: HttpContext) {
        try {
            const colis = await Colis.findOrFail(request.param().tracking_number)
            return response.ok({ colis: colis.serialize() })
        } catch (error) {
            return response.notFound({ message: 'Colis not found', error_code: error })
        }
    }
}