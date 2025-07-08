import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const historiqueLivraisons = [
      // Historique pour la livraison complétée (id: 4)
      {
        livraison_id: 4,
        status: 'scheduled',
        remarks: 'Livraison programmée et acceptée par le livreur',
        update_time: new Date('2025-01-05 09:00:00'),
      },
      {
        livraison_id: 4,
        status: 'in_progress',
        remarks: "Colis récupéré chez l'expéditeur",
        update_time: new Date('2025-01-05 10:30:00'),
      },
      {
        livraison_id: 4,
        status: 'in_progress',
        remarks: 'En transit - Arrivée prévue à Nation dans 30 min',
        update_time: new Date('2025-01-05 14:00:00'),
      },
      {
        livraison_id: 4,
        status: 'completed',
        remarks: 'Livraison effectuée avec succès. Signature: Marie D.',
        update_time: new Date('2025-01-05 17:45:00'),
      },

      // Historique pour la livraison en cours (épicerie fine - id: 1)
      {
        livraison_id: 1,
        status: 'scheduled',
        remarks: 'Nouvelle livraison disponible',
        update_time: new Date('2025-01-15 08:00:00'),
      },
      {
        livraison_id: 1,
        status: 'in_progress',
        remarks: 'Livraison acceptée par Ahmed B.',
        update_time: new Date('2025-01-15 08:15:00'),
      },
      {
        livraison_id: 1,
        status: 'in_progress',
        remarks: "Colis récupéré à l'Épicerie Fine des Abbesses",
        update_time: new Date('2025-01-15 09:00:00'),
      },

      // Historique pour la livraison en cours (viande - id: 3)
      {
        livraison_id: 3,
        status: 'scheduled',
        remarks: 'Commande urgente - Livraison prioritaire',
        update_time: new Date('2025-01-15 07:30:00'),
      },
      {
        livraison_id: 3,
        status: 'in_progress',
        remarks: 'Prise en charge par Lucas B. - Véhicule réfrigéré',
        update_time: new Date('2025-01-15 07:45:00'),
      },
      {
        livraison_id: 3,
        status: 'in_progress',
        remarks: 'Colis chargé, température contrôlée à 4°C',
        update_time: new Date('2025-01-15 08:00:00'),
      },

      // Historique pour la livraison annulée (id: 6)
      {
        livraison_id: 6,
        status: 'scheduled',
        remarks: 'Accompagnement médical programmé',
        update_time: new Date('2025-01-12 10:00:00'),
      },
      {
        livraison_id: 6,
        status: 'cancelled',
        remarks: 'Annulé par le client : Rendez-vous médical reporté',
        update_time: new Date('2025-01-12 12:30:00'),
      },
    ]

    await this.client.table('historique_livraisons').insert(historiqueLivraisons)
  }
}
