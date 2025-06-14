import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const assets = [
      {
        id: 9, // Frank Garcia
        store_name: "Frank's Electronics",
        business_address: "147 Commerce Street, 59000 Lille",
        contact_number: "0147258369",
        contract_start_date: new Date('2023-01-01'),
        contract_end_date: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 10, // Grace Martinez
        store_name: "Grace's Boutique",
        business_address: "258 Shop Avenue, 67000 Strasbourg",
        contact_number: "0258147963",
        contract_start_date: new Date('2023-06-01'),
        contract_end_date: new Date('2024-06-01'),
        created_at: new Date(),
        updated_at: new Date()
      },
    ]
    await this.client.table('commercants').insert(assets)
  }
}