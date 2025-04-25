import type { HttpContext } from '@adonisjs/core/http'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import { colisValidator } from '#validators/create_coli'

export default class ColisController {
    async create({ request, response }: HttpContext) {
        const { annonce_id, weight, length, width, height, content_description } = await request.validateUsing(colisValidator)

        await Annonce.findOrFail(annonce_id)

        let trackingNumber = `COLIS-${Math.floor(Math.random() * 1e6)}`
        while (await Colis.findBy('tracking_number', trackingNumber)) {
            trackingNumber = `COLIS-${Math.floor(Math.random() * 1e6)}`
        }

        const colis = await Colis.create({
            annonceId: annonce_id,
            trackingNumber,
            weight,
            length,
            width,
            height,
            contentDescription: content_description ?? null,
            status: 'stored',
        })

        await colis.load('annonce')
        return response.created({ colis: colis.serialize() })
    }

    async getColis({ request, response }: HttpContext) {
        const colis = await Colis.query()
            .where('tracking_number', request.param('tracking_number'))
            .preload('annonce')
            .preload('livraisons')
            .firstOrFail()

        return response.ok({ colis: colis.serialize() })
    }
}