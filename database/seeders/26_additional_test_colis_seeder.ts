import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import ColisLocationHistory from '#models/colis_location_history'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    console.log('🌱 Création de colis de test supplémentaires...')

    // Récupérer les annonces existantes
    const annonces = await Annonce.query().limit(3)
    if (annonces.length === 0) {
      console.log('⚠️ Aucune annonce trouvée - création des colis ignorée')
      return
    }

    const testColis = [
      {
        trackingNumber: 'TRACK-1',
        annonceId: annonces[0]?.id,
        status: 'stored',
        description: 'Colis en attente de prise en charge',
      },
      {
        trackingNumber: 'TRACK-2',
        annonceId: annonces[1]?.id || annonces[0]?.id,
        status: 'in_transit',
        description: 'Colis en cours de livraison',
      },
      {
        trackingNumber: 'TRACK-3',
        annonceId: annonces[2]?.id || annonces[0]?.id,
        status: 'delivered',
        description: 'Colis livré avec succès',
      },
    ]

    for (const testColi of testColis) {
      // Vérifier si le colis existe déjà
      const existingColis = await Colis.findBy('tracking_number', testColi.trackingNumber)
      if (existingColis) {
        console.log(`✅ Le colis ${testColi.trackingNumber} existe déjà`)
        continue
      }

      // Créer le colis
      const colis = await Colis.create({
        annonceId: testColi.annonceId,
        trackingNumber: testColi.trackingNumber,
        weight: 1.0 + Math.random() * 2,
        length: 20 + Math.random() * 20,
        width: 15 + Math.random() * 15,
        height: 5 + Math.random() * 10,
        contentDescription: `Colis de test ${testColi.trackingNumber}`,
        status: testColi.status,
        locationType:
          testColi.status === 'delivered'
            ? 'delivered'
            : testColi.status === 'in_transit'
              ? 'in_transit'
              : 'client_address',
        locationId: testColi.status === 'delivered' ? null : 1,
        currentAddress:
          testColi.status === 'delivered'
            ? 'Livré à destination'
            : testColi.status === 'in_transit'
              ? 'En transit'
              : 'Adresse de départ',
      })

      // Créer l'historique de localisation
      await ColisLocationHistory.create({
        colisId: colis.id,
        locationType: 'client_address',
        locationId: 1,
        address: 'Adresse de départ',
        description: 'Colis créé et pris en charge',
        movedAt: DateTime.now().minus({ hours: 3 }),
      })

      if (testColi.status === 'in_transit' || testColi.status === 'delivered') {
        await ColisLocationHistory.create({
          colisId: colis.id,
          locationType: 'in_transit',
          locationId: null,
          address: 'En transit',
          description: 'Colis en cours de livraison',
          movedAt: DateTime.now().minus({ hours: 1 }),
        })
      }

      if (testColi.status === 'delivered') {
        await ColisLocationHistory.create({
          colisId: colis.id,
          locationType: 'delivered',
          locationId: null,
          address: 'Livré à destination',
          description: 'Colis livré avec succès',
          movedAt: DateTime.now(),
        })
      }

      console.log(`✅ Colis ${testColi.trackingNumber} créé avec succès`)
    }
  }
}
