import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Admin from '#models/admin'
import Utilisateur from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des admins existent déjà
    const existingAdmins = await Admin.query().limit(1)
    if (existingAdmins.length > 0) {
      console.log('Des admins existent déjà, seeder ignoré')
      return
    }

    // Récupérer l'utilisateur admin par son email
    const adminUser = await Utilisateur.findBy('email', 'admin@ecodeli.fr')

    if (adminUser) {
      await Admin.create({
        id: adminUser.id,
        privileges: 'super_admin',
      })
      console.log(
        `✅ Admin ${adminUser.first_name} ${adminUser.last_name} créé (id: ${adminUser.id})`
      )
    } else {
      console.error(
        'Utilisateur admin non trouvé. Assurez-vous que le seeder des utilisateurs a été exécuté.'
      )
    }
  }
}
