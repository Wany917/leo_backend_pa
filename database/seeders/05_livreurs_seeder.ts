import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Récupérer les utilisateurs livreurs par email
    const ahmed = await Utilisateurs.findBy('email', 'ahmed.benali@gmail.com')
    const sophie = await Utilisateurs.findBy('email', 'sophie.rousseau@laposte.net')

    if (!ahmed || !sophie) {
      console.log('❌ Utilisateurs livreurs non trouvés, vérifiez le seeder utilisateurs')
      return
    }

    // Vérifier si des livreurs existent déjà
    const existingLivreurs = await this.client.from('livreurs').select('*').limit(1)
    if (existingLivreurs.length > 0) {
      console.log('Des livreurs existent déjà, seeder ignoré')
      return
    }

    const livreurs = [
      {
        id: ahmed.id,
        availability_status: 'available',
        rating: 4.8,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: sophie.id,
        availability_status: 'busy',
        rating: 4.9,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('livreurs').insert(livreurs)
    console.log('✅ Livreurs créés avec succès')
  }
}
