import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const admins = [
      {
        id: 1, // John Doe - Super Admin
        privileges: 'super',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2, // Admin Super - Basic Admin
        privileges: 'basic',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('admins').insert(admins)
  }
}
