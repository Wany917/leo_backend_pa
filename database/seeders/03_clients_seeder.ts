import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Récupérer les utilisateurs clients par email
    const marie = await Utilisateurs.findBy('email', 'marie.dupont@gmail.com')
    const jean = await Utilisateurs.findBy('email', 'jean.martin@outlook.fr')

    if (!marie || !jean) {
      console.log('❌ Utilisateurs clients non trouvés, vérifiez le seeder utilisateurs')
      return
    }

    // Vérifier si des clients existent déjà
    const existingClients = await this.client.from('clients').select('*').limit(1)
    if (existingClients.length > 0) {
      console.log('Des clients existent déjà, seeder ignoré')
      return
    }

    const clients = [
      {
        id: marie.id,
        loyalty_points: 150,
        preferred_payment_method: 'carte_bancaire',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: jean.id,
        loyalty_points: 75,
        preferred_payment_method: 'paypal',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('clients').insert(clients)
    console.log('✅ Clients créés avec succès')
  }
}
