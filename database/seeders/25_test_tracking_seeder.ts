import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Colis from '#models/colis'
import Annonce from '#models/annonce'
import ColisLocationHistory from '#models/colis_location_history'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    console.log('🌱 Création du colis de test TRACK-9...')

    // Vérifier si le colis TRACK-9 existe déjà
    const existingColis = await Colis.findBy('tracking_number', 'TRACK-9')
    if (existingColis) {
      console.log('✅ Le colis TRACK-9 existe déjà')
      return
    }

    // Récupérer une annonce existante pour associer le colis
    const annonce = await Annonce.query().first()
    if (!annonce) {
      console.log('⚠️ Aucune annonce trouvée - création du colis ignorée')
      return
    }

    // Créer le colis avec le tracking number TRACK-9
    const colis = await Colis.create({
      annonceId: annonce.id,
      trackingNumber: 'TRACK-9',
      weight: 1.5,
      length: 30,
      width: 20,
      height: 10,
      contentDescription: 'Colis de test pour tracking',
      status: 'in_transit',
      locationType: 'in_transit',
      locationId: null,
      currentAddress: 'En transit - Position de test',
    })

    // Créer l'historique de localisation
    await ColisLocationHistory.create({
      colisId: colis.id,
      locationType: 'client_address',
      locationId: annonce.utilisateurId,
      address: 'Adresse de départ - Test',
      description: 'Colis créé et pris en charge',
      movedAt: DateTime.now().minus({ hours: 2 }),
    })

    await ColisLocationHistory.create({
      colisId: colis.id,
      locationType: 'in_transit',
      locationId: null,
      address: 'En transit - Position de test',
      description: 'Colis en cours de livraison',
      movedAt: DateTime.now().minus({ hours: 1 }),
    })

    console.log('✅ Colis TRACK-9 créé avec succès')
  }
}
