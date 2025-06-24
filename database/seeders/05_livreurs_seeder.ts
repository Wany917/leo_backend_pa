import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const livreurs = [
      {
        id: 5, // Ahmed Benali - Paris
        availability_status: 'available',
        rating: 4.8,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 6, // Sophie Rousseau - Marseille
        availability_status: 'available',
        rating: 4.6,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('livreurs').insert(livreurs)
  }
}
