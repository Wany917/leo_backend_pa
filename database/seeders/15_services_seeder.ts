import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const services = [
      // Services d'Isabelle Moreau (ID 7) - Transport de personnes
      {
        id: 1,
        prestataireId: 7,
        service_type_id: 1, // Transport de personnes
        name: 'Transport médical Paris Intra-muros',
        description:
          'Transport adapté pour personnes à mobilité réduite avec accompagnement médical',
        price: 35.0,
        start_date: new Date('2025-01-25 08:00:00'),
        end_date: new Date('2025-01-25 10:00:00'),
        location: 'Paris Intra-muros',
        status: 'scheduled',
        duration: 120, // 2 heures
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        prestataireId: 7,
        service_type_id: 1,
        name: 'Trajet aéroport Charles de Gaulle',
        description: 'Transport vers/depuis CDG avec assistance bagages',
        price: 65.0,
        start_date: new Date('2025-01-26 06:00:00'),
        end_date: new Date('2025-01-26 09:00:00'),
        location: 'Paris - CDG',
        status: 'scheduled',
        duration: 180, // 3 heures
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Services de Thomas Petit (ID 8) - Services ménagers
      {
        id: 3,
        prestataireId: 8,
        service_type_id: 2, // Services ménagers
        name: 'Grand ménage appartement T2/T3',
        description:
          'Ménage complet avec produits écologiques inclus - fenêtres, sols, salle de bain',
        price: 75.0,
        start_date: new Date('2025-01-28 09:00:00'),
        end_date: new Date('2025-01-28 13:00:00'),
        location: 'Lille et métropole',
        status: 'scheduled',
        duration: 240, // 4 heures
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        prestataireId: 8,
        service_type_id: 2,
        name: 'Ménage régulier hebdomadaire',
        description: 'Service de ménage hebdomadaire pour maintenance courante',
        price: 45.0,
        start_date: new Date('2025-01-30 10:00:00'),
        end_date: new Date('2025-01-30 12:00:00'),
        location: 'Lille',
        status: 'scheduled',
        duration: 120, // 2 heures
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 5,
        prestataireId: 8,
        service_type_id: 2,
        name: 'Nettoyage après déménagement',
        description: 'Remise en état complète après déménagement - état des lieux',
        price: 120.0,
        start_date: new Date('2025-02-01 08:00:00'),
        end_date: new Date('2025-02-01 14:00:00'),
        location: 'Lille et environs',
        status: 'scheduled',
        duration: 360, // 6 heures
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Service complété pour test
      {
        id: 6,
        prestataireId: 7,
        service_type_id: 1,
        name: 'Transport urgent hôpital',
        description: "Transport d'urgence pour examen médical",
        price: 50.0,
        start_date: new Date('2025-01-20 14:00:00'),
        end_date: new Date('2025-01-20 16:00:00'),
        location: 'Paris 11ème vers Hôpital Saint-Antoine',
        status: 'completed',
        duration: 90,
        is_active: true,
        created_at: new Date('2025-01-20'),
        updated_at: new Date('2025-01-20'),
      },
    ]

    await this.client.table('services').insert(services)
  }
}
