import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const subscriptions = [
      // Clients avec abonnement Free (par défaut)
      {
        id: 1,
        utilisateur_id: 3, // Marie Dupont
        subscription_type: 'free',
        monthly_price: 0.0,
        status: 'active',
        start_date: new Date('2024-12-01'),
        end_date: null, // Free n'expire jamais
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        utilisateur_id: 4, // Jean Martin
        subscription_type: 'starter',
        monthly_price: 9.9,
        status: 'active',
        start_date: new Date('2024-11-15'),
        end_date: new Date('2025-11-15'),
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Livreurs avec abonnement Starter pour visibilité
      {
        id: 3,
        utilisateur_id: 5, // Ahmed Benali
        subscription_type: 'starter',
        monthly_price: 9.9,
        status: 'active',
        start_date: new Date('2024-10-01'),
        end_date: new Date('2025-10-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        utilisateur_id: 6, // Sophie Rousseau
        subscription_type: 'free',
        monthly_price: 0.0,
        status: 'active',
        start_date: new Date('2024-12-10'),
        end_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Prestataires avec Premium pour services avancés
      {
        id: 5,
        utilisateur_id: 7, // Isabelle Moreau
        subscription_type: 'premium',
        monthly_price: 19.99,
        status: 'active',
        start_date: new Date('2024-09-01'),
        end_date: new Date('2025-09-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 6,
        utilisateur_id: 8, // Thomas Petit
        subscription_type: 'starter',
        monthly_price: 9.9,
        status: 'active',
        start_date: new Date('2024-11-01'),
        end_date: new Date('2025-11-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Commercants avec Premium pour business features
      {
        id: 7,
        utilisateur_id: 9, // François Dubois
        subscription_type: 'premium',
        monthly_price: 19.99,
        status: 'active',
        start_date: new Date('2024-08-01'),
        end_date: new Date('2025-08-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 8,
        utilisateur_id: 10, // Nathalie Sanchez
        subscription_type: 'premium',
        monthly_price: 19.99,
        status: 'active',
        start_date: new Date('2024-07-15'),
        end_date: new Date('2025-07-15'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('subscriptions').insert(subscriptions)
  }
}
