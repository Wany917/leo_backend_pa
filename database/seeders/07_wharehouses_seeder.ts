import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const wharehouses = [
      {
        id: 1,
        location: 'EcoDeli Paris Nord - 10 Avenue du Général de Gaulle, 93500 Pantin',
        capacity: 5000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        location: 'EcoDeli Paris Sud - 140 Avenue du Général Leclerc, 75014 Paris',
        capacity: 3500,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        location: 'EcoDeli Paris Est - 20 Rue de Lagny, 75020 Paris',
        capacity: 4000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        location: 'EcoDeli Paris Ouest - 5 Boulevard Murat, 75016 Paris',
        capacity: 2500,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('wharehouses').insert(wharehouses)
  }
}
