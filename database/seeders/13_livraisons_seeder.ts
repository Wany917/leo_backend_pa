import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des livraisons existent déjà
    const existingLivraisons = await this.client.from('livraisons').select('*').limit(1)
    if (existingLivraisons.length > 0) {
      console.log('Des livraisons existent déjà, seeder ignoré')
      return
    }

    // Vérifier que les livreurs et clients existent
    const livreurs = await this.client.from('livreurs').select('id').limit(5)
    const clients = await this.client.from('clients').select('id').limit(5)

    if (livreurs.length === 0 || clients.length === 0) {
      console.log('❌ Livreurs ou clients manquants, impossible de créer des livraisons')
      return
    }

    const livraisons = [
      {
        livreur_id: livreurs[0]?.id,
        client_id: clients[0]?.id,
        pickup_location: 'Paris Centre',
        dropoff_location: 'Lyon Gare',
        status: 'in_progress',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        livreur_id: livreurs[1]?.id,
        client_id: clients[1]?.id,
        pickup_location: 'Marseille Vieux-Port',
        dropoff_location: 'Nice Centre',
        status: 'scheduled',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('livraisons').insert(livraisons)
    console.log('✅ Livraisons créées avec succès')
  }
}
