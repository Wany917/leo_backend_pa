import type { HttpContext } from '@adonisjs/core/http'
import Livraison from '#models/livraison'
import Annonce from '#models/annonce'
import Colis from '#models/colis'
import { livraisonValidator } from '#validators/create_livraison'
import { DateTime } from 'luxon'

export default class LivraisonsController {
    async acceptAnnonce({ request, response }: HttpContext) {
        const annonceId = request.param('id')
        const { livreur_id, scheduled_date, pickup_location, dropoff_location } = await request.validateUsing(livraisonValidator)

        await Annonce.findOrFail(annonceId)
    
        const livraison = await Livraison.create({
            livreur_id,
            scheduled_date: DateTime.fromJSDate(scheduled_date),
            pickup_location,
            dropoff_location,
            status: 'scheduled',
        })
    
        const colisList = await Colis.query().where('annonce_id', annonceId)
        await livraison.related('colis').saveMany(colisList)
    
        return response.created({
            message: 'Annonce accepted, livraison created',
            livraison: livraison.serialize(),
            colis: colisList.map((c) => c.serialize()),
        })
    }
}