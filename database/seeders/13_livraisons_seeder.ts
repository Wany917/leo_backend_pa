import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livraison from '#models/livraison'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des livraisons existent déjà
    const existingLivraisons = await Livraison.query().limit(1)
    if (existingLivraisons.length > 0) {
      console.log('Des livraisons existent déjà, seeder ignoré')
      return
    }

    // ✅ LIVRAISONS AVEC SCÉNARIOS DE PAIEMENT COHÉRENTS
    const livraisons = [
      // =================================================================
      // LIVRAISON 1: Documents urgents - Marie → Ahmed
      // EN ATTENTE DE PRISE EN CHARGE
      // =================================================================
      {
        clientId: 2, // Marie Dupont
        livreurId: null, // Pas encore pris en charge
        annonceId: 1, // Annonce des documents urgents
        status: 'scheduled' as const,
        pickupLocation: '15 rue de Rivoli, 75001 Paris',
        dropoffLocation: '35 rue Lepic, 75018 Paris',
        price: 25.5,
        amount: 25.5, // Prix de l'annonce
        paymentStatus: 'unpaid' as const, // Pas encore payé
        paymentIntentId: null,
      },

      // =================================================================
      // LIVRAISON 2: Cadeau surprise - Jean → Fatima
      // EN ATTENTE DE PRISE EN CHARGE
      // =================================================================
      {
        clientId: 3, // Jean Martin
        livreurId: null, // Pas encore pris en charge
        annonceId: 2, // Annonce cadeau surprise
        status: 'scheduled' as const,
        pickupLocation: '25 avenue des Champs-Élysées, 75008 Paris',
        dropoffLocation: '8 rue de la République, 75011 Paris',
        price: 18.75,
        amount: 18.75,
        paymentStatus: 'unpaid' as const,
        paymentIntentId: null,
      },

      // =================================================================
      // LIVRAISON 3: Médicaments - Sophie → Ahmed
      // PRIS EN CHARGE PAR AHMED - PAYÉ ET EN TRANSIT
      // =================================================================
      {
        clientId: 4, // Sophie Bernard
        livreurId: 5, // Ahmed Benali
        annonceId: 3, // Annonce médicaments
        status: 'in_progress' as const,
        pickupLocation: '42 rue de la Paix, 75002 Paris',
        dropoffLocation: '18 rue de Belleville, 75020 Paris',
        price: 32.0,
        amount: 32.0,
        paymentStatus: 'pending' as const, // Payé mais pas encore libéré
        paymentIntentId: 'pi_test_medicaments_001',
      },

      // =================================================================
      // LIVRAISON 4: Œuvre d'art - Marie → Lucas
      // EN ATTENTE DE PRISE EN CHARGE
      // =================================================================
      {
        clientId: 2, // Marie Dupont (deuxième livraison)
        livreurId: null, // Pas encore pris en charge
        annonceId: 4, // Annonce œuvre d'art
        status: 'scheduled' as const,
        pickupLocation: '15 rue de Rivoli, 75001 Paris',
        dropoffLocation: '33 rue Saint-Germain, 75006 Paris',
        price: 45.0,
        amount: 45.0,
        paymentStatus: 'unpaid' as const,
        paymentIntentId: null,
      },

      // =================================================================
      // LIVRAISON 5: Livraison terminée pour les tests de validation
      // LIVRAISON TERMINÉE AVEC PAIEMENT À VALIDER
      // =================================================================
      {
        clientId: 3, // Jean Martin
        livreurId: 6, // Lucas Dubois
        annonceId: null, // Pas d'annonce associée pour ce test
        status: 'completed' as const,
        pickupLocation: '25 avenue des Champs-Élysées, 75008 Paris',
        dropoffLocation: '33 rue Saint-Germain, 75006 Paris',
        price: 21.5,
        amount: 21.5,
        paymentStatus: 'pending' as const, // Payé mais en attente de validation par code
        paymentIntentId: 'pi_test_validation_code_001',
        deliveredAt: DateTime.fromJSDate(new Date('2025-01-28T14:45:00')),
      },
    ]

    for (const livraisonData of livraisons) {
      await Livraison.create(livraisonData)
    }

    console.log('✅ 5 livraisons créées avec scénarios de paiement variés')
  }
}
