import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Client from '#models/client'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des clients existent déjà
    const existingClients = await Client.query().limit(1)
    if (existingClients.length > 0) {
      console.log('Des clients existent déjà, seeder ignoré')
      return
    }

    const emails = [
      'emma.dubois@email-test.fr',
      'antoine.martin@fakemail.fr',
      'sophie.bernard@testmail.com',
      'julien.leroy@fakemail.org',
      'marie.dufour@email-test.com',
      'lucas.moreau@testmail.org',
    ]

    let created = 0
    for (const email of emails) {
      const user = await Utilisateurs.findBy('email', email)
      if (!user) continue

      await Client.create({
        id: user.id,
        loyalty_points: Math.floor(Math.random() * 300),
        preferred_payment_method: 'carte_bancaire',
      })
      created++
      console.log(`✅ Profil client créé pour ${email}`)
    }

    console.log(`✅ ${created} clients créés`)
  }
}
