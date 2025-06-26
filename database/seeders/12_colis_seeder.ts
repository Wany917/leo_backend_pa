import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des colis existent déjà
    const existingColis = await this.client.from('colis').select('*').limit(1)
    if (existingColis.length > 0) {
      console.log('Des colis existent déjà, seeder ignoré')
      return
    }

    // Vérifier que les annonces existent
    const annonces = await this.client.from('annonces').select('id').limit(10)
    if (annonces.length === 0) {
      console.log('❌ Aucune annonce trouvée, impossible de créer des colis')
      return
    }

    const colis = [
      {
        annonce_id: annonces[0]?.id,
        tracking_number: 'ED2025001',
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        content_description: 'Produits artisanaux locaux',
        status: 'stored',
        location_type: 'warehouse',
        location_id: 1,
        current_address: 'Entrepôt EcoDeli Paris',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        annonce_id: annonces[1]?.id,
        tracking_number: 'ED2025002',
        weight: 1.2,
        length: 25,
        width: 15,
        height: 10,
        content_description: 'Documents importants',
        status: 'in_transit',
        location_type: 'in_transit',
        location_id: null,
        current_address: 'En transit vers Lyon',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('colis').insert(colis)
    console.log('✅ Colis créés avec succès')
  }
}
