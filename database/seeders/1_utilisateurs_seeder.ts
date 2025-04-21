import { BaseSeeder } from '@adonisjs/lucid/seeders'
import hash from '@adonisjs/core/services/hash'

export default class extends BaseSeeder {
  async run() {
    const password = await hash.make('123456')
    const assets = [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        address: '61 Rue de Ménilmontant, 75020 Paris',
        phone_number: '1234567890',
        state: 'open',
        email: 'john.doe@example.com',
        password: password,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        address: '24 Av. Albert Petit, 92220 Bagneux',
        phone_number: '0987654321',
        state: 'closed',
        email: 'jane.smith@example.com',
        password: password,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        first_name: 'Alice',
        last_name: 'Johnson',
        address: null,
        phone_number: null,
        state: 'open',
        email: 'alice.johnson@example.com',
        password: password,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        first_name: 'Bob',
        last_name: 'Brown',
        address: null,
        phone_number: null,
        state: 'open',
        email: 'bob.brown@example.com',
        password: password,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]
    await this.client.table('utilisateurs').insert(assets)
  }
}
