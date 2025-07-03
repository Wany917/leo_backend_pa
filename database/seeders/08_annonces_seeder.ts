import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Annonce from '#models/annonce'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des annonces existent déjà
    const existingAnnonces = await Annonce.query().limit(1)
    if (existingAnnonces.length > 0) {
      console.log('Des annonces existent déjà, seeder ignoré')
      return
    }

    // ✅ ANNONCES AVEC TRAJETS LOGIQUES PARISIENS
    const annonces = [
      // =================================================================
      // ANNONCE 1: Marie (Rivoli) → Montmartre
      // =================================================================
      {
        utilisateurId: 2, // Marie Dupont
        title: 'Livraison documents urgents',
        description: 'Documents administratifs à livrer en urgence chez un notaire',
        startLocation: '15 rue de Rivoli, 75001 Paris',
        endLocation: '35 rue Lepic, 75018 Paris',
        price: 25.5,
        status: 'pending' as const,
        type: 'transport_colis' as const,
        tags: ['urgent', 'documents', 'notaire'],
        desiredDate: DateTime.fromJSDate(new Date('2025-01-29T16:00:00')),
        insuranceAmount: 50.0,
        priority: true,
      },

      // =================================================================
      // ANNONCE 2: Jean (Champs-Élysées) → République
      // =================================================================
      {
        utilisateurId: 3, // Jean Martin
        title: 'Envoi cadeau surprise',
        description: 'Bouquet de fleurs et chocolats pour anniversaire surprise',
        startLocation: '25 avenue des Champs-Élysées, 75008 Paris',
        endLocation: '8 rue de la République, 75011 Paris',
        price: 18.75,
        status: 'pending' as const,
        type: 'transport_colis' as const,
        tags: ['cadeau', 'fleurs', 'fragile'],
        desiredDate: DateTime.fromJSDate(new Date('2025-01-30T14:00:00')),
        insuranceAmount: 30.0,
        priority: false,
      },

      // =================================================================
      // ANNONCE 3: Sophie (Opéra) → Belleville
      // =================================================================
      {
        utilisateurId: 4, // Sophie Bernard
        title: 'Livraison médicaments',
        description: 'Médicaments prescrits à livrer chez personne âgée',
        startLocation: '42 rue de la Paix, 75002 Paris',
        endLocation: '18 rue de Belleville, 75020 Paris',
        price: 32.0,
        status: 'active' as const, // Déjà prise par un livreur
        type: 'transport_colis' as const,
        tags: ['médical', 'urgent', 'personnes-âgées'],
        desiredDate: DateTime.fromJSDate(new Date('2025-01-29T10:00:00')),
        insuranceAmount: 0.0,
        priority: true,
      },

      // =================================================================
      // ANNONCE 4: Marie (Rivoli) → Saint-Germain
      // =================================================================
      {
        utilisateurId: 2, // Marie Dupont (deuxième annonce)
        title: "Transport œuvre d'art",
        description: 'Petit tableau à transporter chez un expert en art',
        startLocation: '15 rue de Rivoli, 75001 Paris',
        endLocation: '33 rue Saint-Germain, 75006 Paris',
        price: 45.0,
        status: 'pending' as const,
        type: 'transport_colis' as const,
        tags: ['art', 'fragile', 'expertise'],
        desiredDate: DateTime.fromJSDate(new Date('2025-01-31T15:00:00')),
        insuranceAmount: 500.0, // Valeur élevée pour œuvre d'art
        priority: false,
      },
    ]

    for (const annonceData of annonces) {
      await Annonce.create(annonceData)
    }

    console.log('✅ 4 annonces créées avec trajets parisiens logiques')
  }
}
