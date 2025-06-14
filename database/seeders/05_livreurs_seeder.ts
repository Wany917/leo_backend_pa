import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const assets = [
      {
        id: 5, // Bob Brown
        availability_status: 'available',
        rating: 4.5,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 6, // Charlie Wilson
        availability_status: 'busy',
        rating: 4.8,
        created_at: new Date(),
        updated_at: new Date()
      },
    ]
    await this.client.table('livreurs').insert(assets)
  }
}