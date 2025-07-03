import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Admin from '#models/admin'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des admins existent déjà
    const existingAdmins = await Admin.query().limit(1)
    if (existingAdmins.length > 0) {
      console.log('Des admins existent déjà, seeder ignoré')
      return
    }

    // ✅ ADMIN BASÉ SUR L'UTILISATEUR SYLVAIN LEVY (ID 1)
    await Admin.create({
      id: 1, // Correspond à l'utilisateur Sylvain Levy
      privileges: 'super_admin',
    })

    console.log('✅ Admin Sylvain Levy créé (id: 1)')
  }
}
