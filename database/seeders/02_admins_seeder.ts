import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const admins = [
      {
        id: 1, // Sylvain Levy - PDG
        privileges: 'super',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2, // Pierre Chabrier - DRH
        privileges: 'advanced',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('admins').insert(admins)
  }
}
