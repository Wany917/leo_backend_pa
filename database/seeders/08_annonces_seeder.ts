import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const annonces = [
      // Annonces de transport de colis
      {
        id: 1,
        utilisateur_id: 3, // Marie Dupont (Paris)
        title: 'Transport Paris → Lyon - Documents urgents',
        description:
          'Besoin de transporter des documents confidentiels de Paris à Lyon dans les 24h. Package sécurisé requis.',
        type: 'transport_colis',
        price: 45.0,
        status: 'active',
        start_location: 'Paris 75001',
        end_location: 'Lyon 69002',
        desired_date: new Date('2025-01-25'),
        insurance_amount: 200.0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        utilisateur_id: 4, // Jean Martin (Paris)
        title: 'Livraison Marseille → Paris - Produits artisanaux',
        description:
          'Transport de savons artisanaux fragiles depuis Marseille. Manipulation délicate nécessaire.',
        type: 'transport_colis',
        price: 55.0,
        status: 'active',
        start_location: 'Marseille 13006',
        end_location: 'Paris 75008',
        desired_date: new Date('2025-01-28'),
        insurance_amount: 150.0,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Annonces de services à la personne
      {
        id: 3,
        utilisateur_id: 7, // Isabelle Moreau (Prestataire transport personnes)
        title: 'Transport médical Paris → Banlieue',
        description:
          'Service de transport médical pour personnes à mobilité réduite. Véhicule adapté et accompagnement.',
        type: 'service_personne',
        price: 35.0,
        status: 'active',
        start_location: 'Paris 75006',
        end_location: 'Versailles 78000',
        desired_date: new Date('2025-01-26'),
        insurance_amount: 0.0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        utilisateur_id: 8, // Thomas Petit (Prestataire services ménagers)
        title: 'Ménage complet appartement - Lille',
        description:
          'Service de ménage complet pour appartement 3 pièces. Produits écologiques inclus.',
        type: 'service_personne',
        price: 80.0,
        status: 'active',
        start_location: 'Lille 59000',
        end_location: 'Lille 59000',
        desired_date: new Date('2025-01-30'),
        insurance_amount: 0.0,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Annonces commercants
      {
        id: 5,
        utilisateur_id: 9, // François Dubois (Commercant épicerie)
        title: 'Livraison produits épicerie fine',
        description:
          'Livraison de paniers gourmets dans Paris et proche banlieue. Produits frais et de qualité.',
        type: 'transport_colis',
        price: 15.0,
        status: 'active',
        start_location: 'Paris 75018',
        end_location: 'Île-de-France',
        desired_date: new Date('2025-01-27'),
        insurance_amount: 50.0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 6,
        utilisateur_id: 10, // Nathalie Sanchez (Commercant savonnerie)
        title: 'Distribution savons naturels - Marseille',
        description:
          'Livraison de commandes de savons naturels faits main dans Marseille et environs.',
        type: 'transport_colis',
        price: 12.0,
        status: 'active',
        start_location: 'Marseille 13006',
        end_location: 'Bouches-du-Rhône',
        desired_date: new Date('2025-01-29'),
        insurance_amount: 30.0,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Annonce complétée pour test
      {
        id: 7,
        utilisateur_id: 3, // Marie Dupont
        title: 'Colis livré - Cadeau anniversaire',
        description: "Cadeau d'anniversaire livré avec succès à ma sœur à Marseille.",
        type: 'transport_colis',
        status: 'completed',
        start_location: 'Paris 75011',
        end_location: 'Marseille 13001',
        price: 60.0,
        insurance_amount: 100.0,
        desired_date: new Date('2025-01-15'),
        created_at: new Date('2025-01-10'),
        updated_at: new Date('2025-01-15'),
      },
    ]

    await this.client.table('annonces').insert(annonces)
  }
}
