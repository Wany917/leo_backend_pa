import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const clients = [
      // Tous les utilisateurs sont aussi des clients par défaut
      {
        id: 1, // Sylvain Levy (Admin)
        loyalty_points: 500,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2, // Pierre Chabrier (Admin)
        loyalty_points: 300,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3, // Marie Dupont (Client)
        loyalty_points: 150,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4, // Jean Martin (Client)
        loyalty_points: 200,
        preferred_payment_method: 'paypal',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 5, // Ahmed Benali (Livreur/Client)
        loyalty_points: 75,
        preferred_payment_method: 'cash',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 6, // Sophie Rousseau (Livreur/Client)
        loyalty_points: 120,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('clients').insert(clients)
  }
}
