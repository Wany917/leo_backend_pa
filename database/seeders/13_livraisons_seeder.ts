import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const livraisons = [
      // Livraison en cours pour l'épicerie fine
      {
        id: 1,
        livreur_id: 5, // Ahmed Benali (Paris)
        client_id: null, // Sera déterminé par l'annonce
        pickup_location: '55 rue des Abbesses, 75018 Paris',
        dropoff_location: '16ème arrondissement, Paris',
        status: 'in_progress',
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Livraison programmée pour les documents urgents
      {
        id: 2,
        livreur_id: 16, // David Lambert (Multi-trajets)
        client_id: 3, // Marie Dupont
        pickup_location: '25 rue de la République, 75011 Paris',
        dropoff_location: '35 quai Saint-Antoine, 69002 Lyon',
        status: 'scheduled',
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Livraison en cours pour la viande
      {
        id: 3,
        livreur_id: 7, // Lucas Bernard (Lyon)
        client_id: null,
        pickup_location: '42 rue de la Bourse, 69002 Lyon',
        dropoff_location: 'Lyon 3ème arrondissement',
        status: 'in_progress',
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Livraison complétée (historique)
      {
        id: 4,
        livreur_id: 6, // Sophie Rousseau (Marseille)
        client_id: 3, // Marie Dupont
        pickup_location: '25 rue de la République, 75011 Paris',
        dropoff_location: '22 rue du Vieux-Port, 13001 Marseille',
        status: 'completed',
        created_at: new Date('2025-01-05'),
        updated_at: new Date('2025-01-10'),
      },
      // Livraison programmée pour les savons
      {
        id: 5,
        livreur_id: null, // En attente d'attribution
        client_id: null,
        pickup_location: '12 cours Julien, 13006 Marseille',
        dropoff_location: '110 rue de Flandre, 75019 Paris',
        status: 'scheduled',
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Livraison annulée (pour test)
      {
        id: 6,
        livreur_id: 15, // Kevin Durand (Lille)
        client_id: 12, // Charlotte Lefebvre
        pickup_location: '20 rue Nationale, 59800 Lille',
        dropoff_location: 'CHU Lille, Avenue Oscar Lambret',
        status: 'cancelled',
        created_at: new Date('2025-01-12'),
        updated_at: new Date('2025-01-12'),
      },
    ]

    await this.client.table('livraisons').insert(livraisons)

    // Créer les associations livraison-colis dans la table pivot
    const livraisonColis = [
      { livraison_id: 1, colis_id: 2 }, // Épicerie fine
      { livraison_id: 2, colis_id: 1 }, // Documents urgents
      { livraison_id: 3, colis_id: 5 }, // Viande
      { livraison_id: 4, colis_id: 6 }, // Cadeau livré
      { livraison_id: 5, colis_id: 3 }, // Savons lot 1
      { livraison_id: 5, colis_id: 7 }, // Savons lot 2
    ]

    await this.client.table('livraison_colis').insert(livraisonColis)
  }
}
