import { BaseSeeder } from '@adonisjs/lucid/seeders'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des portefeuilles existent déjà
    const existingPortefeuilles = await PortefeuilleEcodeli.query().limit(1)
    if (existingPortefeuilles.length > 0) {
      console.log('Des portefeuilles existent déjà, seeder ignoré')
      return
    }

    // ✅ PORTEFEUILLES COHÉRENTS AVEC LES PAIEMENTS
    const portefeuilles = [
      // =================================================================
      // PORTEFEUILLE AHMED BENALI (Livreur ID 5)
      // Livraison 3: Médicaments (32€ en attente)
      // =================================================================
      {
        utilisateurId: 5, // Ahmed Benali
        soldeDisponible: 89.75, // Anciens paiements libérés
        soldeEnAttente: 32.0, // Paiement des médicaments en attente de validation
        iban: 'FR76 1234 5678 9012 3456 789A',
        bic: 'BNPAFRPP123',
        virementAutoActif: true,
        seuilVirementAuto: 100.0,
        isActive: true,
      },

      // =================================================================
      // PORTEFEUILLE LUCAS DUBOIS (Livreur ID 6)
      // Livraison 5: Validation code (21.50€ en attente)
      // =================================================================
      {
        utilisateurId: 6, // Lucas Dubois
        soldeDisponible: 156.25, // Anciens paiements libérés
        soldeEnAttente: 21.5, // Paiement en attente de validation par code
        iban: 'FR76 9876 5432 1098 7654 321B',
        bic: 'BNPAFRPP456',
        virementAutoActif: false,
        seuilVirementAuto: 150.0,
        isActive: true,
      },

      // =================================================================
      // PORTEFEUILLE FATIMA ALAOUI (Livreur ID 7)
      // Pas de livraison en cours - Portefeuille vide pour tests
      // =================================================================
      {
        utilisateurId: 7, // Fatima Alaoui
        soldeDisponible: 45.0, // Quelques paiements précédents
        soldeEnAttente: 0.0, // Aucun paiement en attente
        iban: 'FR76 1111 2222 3333 4444 555C',
        bic: 'BNPAFRPP789',
        virementAutoActif: true,
        seuilVirementAuto: 50.0,
        isActive: true,
      },
    ]

    for (const portefeuilleData of portefeuilles) {
      await PortefeuilleEcodeli.create(portefeuilleData)
    }

    console.log('✅ 3 portefeuilles créés avec soldes cohérents aux paiements')
  }
}
