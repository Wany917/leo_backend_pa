import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Récupérer les utilisateurs admin par email
    const sylvain = await Utilisateurs.findBy('email', 'sylvain.levy@ecodeli.fr')
    const pierre = await Utilisateurs.findBy('email', 'pierre.chabrier@ecodeli.fr')

    if (!sylvain || !pierre) {
      console.log('❌ Utilisateurs admin non trouvés, vérifiez le seeder utilisateurs')
      return
    }

    // Vérifier si des admins existent déjà
    const existingAdmins = await this.client.from('admins').select('*').limit(1)
    if (existingAdmins.length > 0) {
      console.log('Des admins existent déjà, seeder ignoré')
      return
    }

    const admins = [
      {
        id: sylvain.id,
        privileges: 'super_admin',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: pierre.id,
        privileges: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('admins').insert(admins)
    console.log('✅ Admins créés avec succès')
  }
}
