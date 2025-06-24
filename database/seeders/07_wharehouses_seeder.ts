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
        location: 'EcoDeli Marseille Centre - 25 Rue de la République, 13002 Marseille',
        capacity: 3500,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        location: 'EcoDeli Lyon Est - 5 Place Bellecour, 69002 Lyon',
        capacity: 4000,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        location: 'EcoDeli Lille Métropole - 8 Rue de la Gare, 59000 Lille',
        capacity: 2500,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('wharehouses').insert(wharehouses)
  }
}
