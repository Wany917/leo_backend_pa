import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des utilisateurs existent déjà
    const existingUsers = await Utilisateurs.query().limit(1)
    if (existingUsers.length > 0) {
      console.log('Des utilisateurs existent déjà, seeder ignoré')
      return
    }

    // Utilisateurs de base avec tous les champs requis (sans IDs fixes)
    const users = [
      // Administrateurs
      {
        first_name: 'Sylvain',
        last_name: 'Levy',
        email: 'sylvain.levy@ecodeli.fr',
        password: '123456',
        address: '110 rue de Flandre',
        city: 'Paris',
        postalCode: '75019',
        country: 'France',
        phone_number: '+33158423100',
        state: 'open',
      },
      {
        first_name: 'Pierre',
        last_name: 'Chabrier',
        email: 'pierre.chabrier@ecodeli.fr',
        password: '123456',
        address: '110 rue de Flandre',
        city: 'Paris',
        postalCode: '75019',
        country: 'France',
        phone_number: '+33158423101',
        state: 'open',
      },
      // Clients
      {
        first_name: 'Marie',
        last_name: 'Dupont',
        email: 'marie.dupont@gmail.com',
        password: '123456',
        address: '25 rue de la République',
        city: 'Paris',
        postalCode: '75011',
        country: 'France',
        phone_number: '+33612345678',
        state: 'open',
      },
      {
        first_name: 'Jean',
        last_name: 'Martin',
        email: 'jean.martin@outlook.fr',
        password: '123456',
        address: '18 avenue des Champs-Élysées',
        city: 'Paris',
        postalCode: '75008',
        country: 'France',
        phone_number: '+33623456789',
        state: 'open',
      },
      // Livreurs
      {
        first_name: 'Ahmed',
        last_name: 'Benali',
        email: 'ahmed.benali@gmail.com',
        password: '123456',
        address: '45 rue de Belleville',
        city: 'Paris',
        postalCode: '75020',
        country: 'France',
        phone_number: '+33634567890',
        state: 'open',
      },
      {
        first_name: 'Sophie',
        last_name: 'Rousseau',
        email: 'sophie.rousseau@laposte.net',
        password: '123456',
        address: '22 rue du Vieux-Port',
        city: 'Marseille',
        postalCode: '13001',
        country: 'France',
        phone_number: '+33645678901',
        state: 'open',
      },
    ]

    // ✅ Utiliser le modèle pour garantir le hachage des mots de passe
    for (const userData of users) {
      await Utilisateurs.create(userData)
    }

    console.log('✅ Utilisateurs créés avec succès')
  }
}
