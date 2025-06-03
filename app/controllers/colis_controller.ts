import type { HttpContext } from '@adonisjs/core/http'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import ColisLocationHistory from '#models/colis_location_history'
import { colisValidator } from '#validators/create_coli'
import { DateTime } from 'luxon'

export default class ColisController {
  // Méthode pour récupérer tous les colis (pour les administrateurs)
  async getAllColis({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const status = request.input('status')
      const search = request.input('search')

      let query = Colis.query().preload('annonce', (annonceQuery) => {
        annonceQuery.preload('utilisateur')
      })

      // Filtrage par statut si fourni
      if (status) {
        query = query.where('status', status)
      }

      // Recherche par numéro de suivi ou description
      if (search) {
        query = query.where((builder) => {
          builder
            .where('tracking_number', 'LIKE', `%${search}%`)
            .orWhere('content_description', 'LIKE', `%${search}%`)
        })
      }

      const colis = await query.orderBy('created_at', 'desc').paginate(page, limit)

      return response.ok({
        colis: colis.serialize(),
      })
    } catch (error) {
      console.error('Error fetching all packages:', error)
      return response.status(500).json({
        error: 'Une erreur est survenue lors de la récupération des colis',
        details: error.message,
      })
    }
  }

  async create({ request, response }: HttpContext) {
    const {
      annonce_id: annonceId,
      weight,
      length,
      width,
      height,
      content_description: contentDescription,
    } = await request.validateUsing(colisValidator)

    const annonce = await Annonce.findOrFail(annonceId)
    await annonce.load('utilisateur')

    let trackingNumber = `COLIS-${Math.floor(Math.random() * 1e6)}`
    while (await Colis.findBy('tracking_number', trackingNumber)) {
      trackingNumber = `COLIS-${Math.floor(Math.random() * 1e6)}`
    }

    const colis = await Colis.create({
      annonceId: annonceId,
      trackingNumber,
      weight,
      length,
      width,
      height,
      contentDescription: contentDescription ?? null,
      status: 'stored',
      locationType: 'client_address',
      locationId: annonce.utilisateur.id,
      currentAddress: annonce.utilisateur.address,
    })

    // Enregistrer l'historique initial
    await ColisLocationHistory.create({
      colisId: colis.id,
      locationType: 'client_address',
      locationId: annonce.utilisateur.id,
      address: annonce.utilisateur.address,
      description: "Colis créé et placé à l'adresse du client",
      movedAt: DateTime.now(),
    })

    await colis.load('annonce')

    // Retourner avec trackingNumber comme clé principale
    return response.created({
      colis: colis.serialize(),
      trackingNumber: colis.trackingNumber,
    })
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
    const { tracking_number: trackingNumber } = request.params()
    const {
      location_type: locationType,
      location_id: locationId,
      address,
      description,
    } = request.body()

    const colis = await Colis.findByOrFail('tracking_number', trackingNumber)

    // Mettre à jour la localisation
    colis.locationType = locationType
    colis.locationId = locationId

    if (locationType === 'client_address') {
      colis.currentAddress = address
    }

    await colis.save()

    // Enregistrer l'historique
    await ColisLocationHistory.create({
      colisId: colis.id,
      locationType: locationType,
      locationId: locationId,
      address: address || null,
      description: description || `Colis déplacé vers ${locationType}`,
      movedAt: DateTime.now(),
    })

    return response.ok({
      message: 'Localisation du colis mise à jour',
      colis: colis.serialize(),
    })
  }
}
