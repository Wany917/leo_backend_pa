import type { HttpContext } from '@adonisjs/core/http'
import Livraison from '#models/livraison'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import { livraisonValidator } from '#validators/create_livraison'
import { DateTime } from 'luxon'

export default class LivraisonsController {
  async create({ request, response }: HttpContext) {
    const annonceId = Number.parseInt(request.param('id'))
    if (Number.isNaN(annonceId)) {
      return response.badRequest({ error: "ID d'annonce invalide" })
    }
    await Annonce.findOrFail(annonceId)

    const payload = await request.validateUsing(livraisonValidator)
    const livraison = await Livraison.create({
      livreurId: payload.livreur_id ?? null,
      pickupLocation: payload.pickup_location,
      dropoffLocation: payload.dropoff_location,
      status: payload.status ?? 'scheduled',
    })

    const colisList = await Colis.query().where('annonce_id', annonceId)
    await livraison.related('colis').saveMany(colisList)
    await livraison.load('colis')

    return response.created({
      livraison: livraison.serialize(),
    })
  }

  async show({ request, response }: HttpContext) {
    const id = Number.parseInt(request.param('id'))
    if (Number.isNaN(id)) {
      return response.badRequest({ error: 'ID de livraison invalide' })
    }

    const livraison = await Livraison.query()
      .where('id', id)
      .preload('livreur')
      .preload('colis')
      .firstOrFail()
    return response.ok({ livraison: livraison.serialize() })
  }

  async update({ request, response }: HttpContext) {
    const id = Number.parseInt(request.param('id'))
    if (Number.isNaN(id)) {
      return response.badRequest({ error: 'ID de livraison invalide' })
    }

    const payload = await request.validateUsing(livraisonValidator)
    const livraison = await Livraison.findOrFail(id)

    livraison.merge({
      livreurId: payload.livreur_id ?? livraison.livreurId,
      pickupLocation: payload.pickup_location ?? livraison.pickupLocation,
      dropoffLocation: payload.dropoff_location ?? livraison.dropoffLocation,
      status: payload.status ?? livraison.status,
    })
    await livraison.save()
    await livraison.load('colis')
    await livraison.load('historique')
    return response.ok({ livraison: livraison.serialize() })
  }
}
