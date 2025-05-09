import type { HttpContext } from '@adonisjs/core/http'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import ColisLocationHistory from '#models/colis_location_history'
import { colisValidator } from '#validators/create_coli'
import { DateTime } from 'luxon'

export default class ColisController {
  async create({ request, response }: HttpContext) {
    const { annonce_id, weight, length, width, height, content_description } =
      await request.validateUsing(colisValidator)

    const annonce = await Annonce.findOrFail(annonce_id)
    await annonce.load('utilisateur')

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
      locationType: 'client_address',
      locationId: null,
      currentAddress: annonce.utilisateur.address,
    })

    // Enregistrer l'historique initial
    await ColisLocationHistory.create({
      colisId: colis.id,
      locationType: 'client_address',
      locationId: null,
      address: annonce.utilisateur.address,
      description: "Colis créé et placé à l'adresse du client",
      movedAt: DateTime.now(),
    })

    await colis.load('annonce')
    return response.created({ colis: colis.serialize() })
  }

  async getColis({ request, response }: HttpContext) {
    const colis = await Colis.query()
      .where('tracking_number', request.param('tracking_number'))
      .preload('annonce')
      .preload('livraisons')
      .preload('stockage')
      .firstOrFail()

    // Obtenir l'historique de localisation
    const locationHistory = await ColisLocationHistory.query()
      .where('colis_id', colis.id)
      .orderBy('moved_at', 'desc')

    return response.ok({
      colis: colis.serialize(),
      locationHistory: locationHistory.map((loc) => loc.serialize()),
    })
  }

  async getLocationHistory({ request, response }: HttpContext) {
    const colis = await Colis.findByOrFail('tracking_number', request.param('tracking_number'))

    const locationHistory = await ColisLocationHistory.query()
      .where('colis_id', colis.id)
      .orderBy('moved_at', 'desc')

    return response.ok({
      tracking_number: colis.trackingNumber,
      locationHistory: locationHistory.map((loc) => loc.serialize()),
    })
  }

  async updateLocation({ request, response }: HttpContext) {
    const { tracking_number } = request.params()
    const { location_type, location_id, address, description } = request.body()

    const colis = await Colis.findByOrFail('tracking_number', tracking_number)

    // Mettre à jour la localisation
    colis.locationType = location_type
    colis.locationId = location_id

    if (location_type === 'client_address') {
      colis.currentAddress = address
    }

    await colis.save()

    // Enregistrer l'historique
    await ColisLocationHistory.create({
      colisId: colis.id,
      locationType: location_type,
      locationId: location_id,
      address: address || null,
      description: description || `Colis déplacé vers ${location_type}`,
      movedAt: DateTime.now(),
    })

    return response.ok({
      message: 'Localisation du colis mise à jour',
      colis: colis.serialize(),
    })
  }
}
