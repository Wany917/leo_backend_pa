import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const assets = [
      {
        id: 7, // Diana Davis
        service_type: 'baby-sitting',
        rating: 4.7,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 8, // Eva Miller
        service_type: 'house-cleaning',
        rating: 4.9,
        created_at: new Date(),
        updated_at: new Date()
      },
    ]
    await this.client.table('prestataires').insert(assets)
  }
}