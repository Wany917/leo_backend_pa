import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const historiqueLivraisons = [
      // Historique pour la livraison complétée (id: 4)
      {
        id: 1,
        livraison_id: 4,
        status: 'scheduled',
        comment: 'Livraison programmée et acceptée par le livreur',
        created_at: new Date('2025-01-05 09:00:00'),
        updated_at: new Date('2025-01-05 09:00:00'),
      },
      {
        id: 2,
        livraison_id: 4,
        status: 'in_progress',
        comment: "Colis récupéré chez l'expéditeur",
        created_at: new Date('2025-01-05 10:30:00'),
        updated_at: new Date('2025-01-05 10:30:00'),
      },
      {
        id: 3,
        livraison_id: 4,
        status: 'in_progress',
        comment: 'En transit - Arrivée prévue à Marseille dans 3h',
        created_at: new Date('2025-01-05 14:00:00'),
        updated_at: new Date('2025-01-05 14:00:00'),
      },
      {
        id: 4,
        livraison_id: 4,
        status: 'completed',
        comment: 'Livraison effectuée avec succès. Signature: Marie D.',
        created_at: new Date('2025-01-05 17:45:00'),
        updated_at: new Date('2025-01-05 17:45:00'),
      },

      // Historique pour la livraison en cours (épicerie fine - id: 1)
      {
        id: 5,
        livraison_id: 1,
        status: 'scheduled',
        comment: 'Nouvelle livraison disponible',
        created_at: new Date('2025-01-15 08:00:00'),
        updated_at: new Date('2025-01-15 08:00:00'),
      },
      {
        id: 6,
        livraison_id: 1,
        status: 'in_progress',
        comment: 'Livraison acceptée par Ahmed B.',
        created_at: new Date('2025-01-15 08:15:00'),
        updated_at: new Date('2025-01-15 08:15:00'),
      },
      {
        id: 7,
        livraison_id: 1,
        status: 'in_progress',
        comment: "Colis récupéré à l'Épicerie Fine des Abbesses",
        created_at: new Date('2025-01-15 09:00:00'),
        updated_at: new Date('2025-01-15 09:00:00'),
      },

      // Historique pour la livraison en cours (viande - id: 3)
      {
        id: 8,
        livraison_id: 3,
        status: 'scheduled',
        comment: 'Commande urgente - Livraison prioritaire',
        created_at: new Date('2025-01-15 07:30:00'),
        updated_at: new Date('2025-01-15 07:30:00'),
      },
      {
        id: 9,
        livraison_id: 3,
        status: 'in_progress',
        comment: 'Prise en charge par Lucas B. - Véhicule réfrigéré',
        created_at: new Date('2025-01-15 07:45:00'),
        updated_at: new Date('2025-01-15 07:45:00'),
      },
      {
        id: 10,
        livraison_id: 3,
        status: 'in_progress',
        comment: 'Colis chargé, température contrôlée à 4°C',
        created_at: new Date('2025-01-15 08:00:00'),
        updated_at: new Date('2025-01-15 08:00:00'),
      },

      // Historique pour la livraison annulée (id: 6)
      {
        id: 11,
        livraison_id: 6,
        status: 'scheduled',
        comment: 'Accompagnement médical programmé',
        created_at: new Date('2025-01-12 10:00:00'),
        updated_at: new Date('2025-01-12 10:00:00'),
      },
      {
        id: 12,
        livraison_id: 6,
        status: 'cancelled',
        comment: 'Annulé par le client : Rendez-vous médical reporté',
        created_at: new Date('2025-01-12 12:30:00'),
        updated_at: new Date('2025-01-12 12:30:00'),
      },
    ]

    await this.client.table('historique_livraisons').insert(historiqueLivraisons)
  }
}
