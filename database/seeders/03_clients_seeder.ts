import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const assets = [
      // Admins as clients
      {
        id: 1, // John Doe (Admin)
        loyalty_points: 500,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2, // Admin Super
        loyalty_points: 300,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Regular clients (existing)
      {
        id: 3, // Jane Smith
        loyalty_points: 150,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 4, // Alice Johnson
        loyalty_points: 200,
        preferred_payment_method: 'paypal',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Delivery people as clients
      {
        id: 5, // Bob Brown (Livreur)
        loyalty_points: 75,
        preferred_payment_method: 'cash',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 6, // Charlie Wilson (Livreur)
        loyalty_points: 120,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Service providers as clients
      {
        id: 7, // Diana Davis (Prestataire)
        loyalty_points: 90,
        preferred_payment_method: 'paypal',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 8, // Eva Miller (Prestataire)
        loyalty_points: 180,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Merchants as clients
      {
        id: 9, // Frank Garcia (Commercant)
        loyalty_points: 250,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 10, // Grace Martinez (Commercant)
        loyalty_points: 320,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]
    await this.client.table('clients').insert(assets)
  }
}