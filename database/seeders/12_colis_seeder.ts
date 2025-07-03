import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Colis from '#models/colis'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des colis existent déjà
    const existingColis = await Colis.query().limit(1)
    if (existingColis.length > 0) {
      console.log('Des colis existent déjà, seeder ignoré')
      return
    }

    // ✅ COLIS CORRESPONDANT AUX ANNONCES CRÉÉES
    const colis = [
      // =================================================================
      // COLIS 1: Documents urgents (Annonce 1 - Marie)
      // =================================================================
      {
        annonceId: 1, // Annonce de Marie - Documents urgents
        trackingNumber: 'ECO-DOC-2025-001',
        contentDescription: 'Enveloppe A4 contenant documents notariaux urgents',
        length: 32, // cm
        width: 22,
        height: 2,
        weight: 0.3, // kg
        status: 'stored' as const,
        locationType: 'warehouse' as const,
        locationId: 1,
        currentAddress: 'Pharmacie Opéra Santé - 42 rue de la Paix, 75002 Paris',
      },

      // =================================================================
      // COLIS 2: Cadeau surprise (Annonce 2 - Jean)
      // =================================================================
      {
        annonceId: 2, // Annonce de Jean - Cadeau surprise
        trackingNumber: 'ECO-CAD-2025-002',
        contentDescription: 'Bouquet de fleurs fraîches + boîte de chocolats belges',
        length: 40,
        width: 30,
        height: 15,
        weight: 1.2,
        status: 'stored' as const,
        locationType: 'client_address' as const,
        locationId: null,
        currentAddress: 'Fleuriste - 25 avenue des Champs-Élysées, 75008 Paris',
      },

      // =================================================================
      // COLIS 3: Médicaments (Annonce 3 - Sophie) - ACTIF
      // =================================================================
      {
        annonceId: 3, // Annonce de Sophie - Médicaments
        trackingNumber: 'ECO-MED-2025-003',
        contentDescription: 'Sachet pharmacie avec médicaments prescrits',
        length: 20,
        width: 15,
        height: 8,
        weight: 0.4,
        status: 'in_transit' as const, // Ahmed l'a pris en charge
        locationType: 'in_transit' as const,
        locationId: null,
        currentAddress: 'En transit avec Ahmed Benali - Direction Belleville',
      },

      // =================================================================
      // COLIS 4: Œuvre d'art (Annonce 4 - Marie)
      // =================================================================
      {
        annonceId: 4, // Annonce de Marie - Œuvre d'art
        trackingNumber: 'ECO-ART-2025-004',
        contentDescription: 'Petit tableau encadré (paysage parisien, 20x25cm)',
        length: 28,
        width: 33,
        height: 5,
        weight: 1.8,
        status: 'stored' as const,
        locationType: 'client_address' as const,
        locationId: null,
        currentAddress: 'Galerie Art & Rivoli - 15 rue de Rivoli, 75001 Paris',
      },
    ]

    for (const colisData of colis) {
      await Colis.create(colisData)
    }

    console.log('✅ 4 colis créés correspondant aux annonces')
  }
}
