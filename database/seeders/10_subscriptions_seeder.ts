import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Subscription from '#models/subscription'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Create sample subscriptions for different user types
    await Subscription.createMany([
      {
        utilisateur_id: 1, // John Doe (Admin)
        subscription_type: 'premium',
        monthly_price: 19.99,
        start_date: DateTime.now().minus({ months: 2 }),
        end_date: DateTime.now().plus({ months: 10 }),
        status: 'active'
      },
      {
        utilisateur_id: 3, // Jane Smith (Client)
        subscription_type: 'starter',
        monthly_price: 9.90,
        start_date: DateTime.now().minus({ days: 15 }),
        end_date: DateTime.now().plus({ days: 15 }),
        status: 'active'
      },
      {
        utilisateur_id: 4, // Alice Johnson (Client)
        subscription_type: 'free',
        monthly_price: 0.00,
        start_date: DateTime.now().minus({ months: 1 }),
        end_date: null,
        status: 'active'
      },
      {
        utilisateur_id: 5, // Bob Brown (Livreur)
        subscription_type: 'starter',
        monthly_price: 9.90,
        start_date: DateTime.now(),
        end_date: DateTime.now().plus({ months: 1 }),
        status: 'active'
      },
      {
        utilisateur_id: 7, // Diana Davis (Prestataire)
        subscription_type: 'premium',
        monthly_price: 19.99,
        start_date: DateTime.now().minus({ days: 10 }),
        end_date: DateTime.now().plus({ months: 1, days: -10 }),
        status: 'active'
      }
    ])
  }
}