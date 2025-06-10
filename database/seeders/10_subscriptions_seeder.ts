import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Subscription from '#models/subscription'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Create sample subscriptions
    await Subscription.createMany([
      {
        utilisateur_id: 1,
        subscription_type: 'free',
        monthly_price: 0.00,
        start_date: DateTime.now(),
        end_date: null,
        status: 'active'
      },
      {
        utilisateur_id: 2,
        subscription_type: 'starter',
        monthly_price: 9.90,
        start_date: DateTime.now(),
        end_date: DateTime.now().plus({ months: 1 }),
        status: 'active'
      },
      {
        utilisateur_id: 3,
        subscription_type: 'premium',
        monthly_price: 19.99,
        start_date: DateTime.now(),
        end_date: DateTime.now().plus({ months: 1 }),
        status: 'active'
      }
    ])
  }
}