import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livreur from '#models/livreur'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des livreurs existent déjà
    const existingLivreurs = await Livreur.query().limit(1)
    if (existingLivreurs.length > 0) {
      console.log('Des livreurs existent déjà, seeder ignoré')
      return
    }
    const emails = [
      'pierre.durand@livreur-test.fr',
      'julie.moreau@livreurfake.com',
      'alex.bernard@livreur-test.org',
    ]

    for (const email of emails) {
      const user = await Utilisateurs.findBy('email', email)
      if (user) {
        await Livreur.create({
          id: user.id,
          disponible: true,
          enService: false,
        })
        console.log(`✅ Profil livreur créé pour ${email} (id: ${user.id})`)
      } else {
        console.log(`❌ Utilisateur introuvable pour livreur: ${email}`)
      }
    }

    console.log('✅ Création des profils livreurs terminée')
  }
}
