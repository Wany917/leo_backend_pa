import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const assets = [
      {
        "id": 1,
        'privileges': 'all',
        "created_at": new Date(),
        "updated_at": new Date()
      }
    ]
    await this.client.table('admins').insert(assets)
  }
}