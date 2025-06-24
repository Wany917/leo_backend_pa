import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Utilisateurs de base avec tous les champs requis
    const users = [
      // Administrateurs
      {
        id: 1,
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
        id: 2,
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
        id: 3,
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
        id: 4,
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
        id: 5,
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
        id: 6,
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
  }
}
