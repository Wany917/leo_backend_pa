import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Admin from '#models/admin'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des admins existent déjà
    const existingAdmins = await Admin.query().limit(1)
    if (existingAdmins.length > 0) {
      console.log('Des admins existent déjà, seeder ignoré')
      return
    }

    // ✅ ADMIN BASÉ SUR L'UTILISATEUR SYLVAIN LEVY (ID 1)
    const sylvain = await Utilisateurs.findBy('email', 'sylvain.levy@ecodeli-test.fr')
    if (sylvain) {
      await Admin.create({
        id: sylvain.id,
        privileges: 'super_admin',
      })
      console.log(`✅ Admin créé pour Sylvain Levy (id: ${sylvain.id})`)
    } else {
      console.log('❌ Utilisateur Sylvain Levy introuvable, admin non créé')
    }
  }
}
