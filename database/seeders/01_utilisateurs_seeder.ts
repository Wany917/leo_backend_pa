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

    // ✅ UTILISATEURS AVEC SCÉNARIOS LOGIQUES ET ADRESSES PARISIENNES RÉELLES
    const users = [
      // =================================================================
      // ADMINISTRATEURS
      // =================================================================
      {
        first_name: 'Sylvain',
        last_name: 'Levy',
        email: 'admin@ecodeli.fr',
        password: '123456',
        address: '110 rue de Flandre',
        city: 'Paris',
        postalCode: '75019',
        country: 'France',
        phone_number: '+33158423100',
        state: 'open',
      },

      // =================================================================
      // CLIENTS AVEC SCÉNARIOS DE TEST LOGIQUES
      // =================================================================
      {
        first_name: 'Marie',
        last_name: 'Dupont',
        email: 'marie.dupont@gmail.com',
        password: '123456',
        address: '15 rue de Rivoli', // Près du Louvre
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        phone_number: '+33612345678',
        state: 'open',
      },
      {
        first_name: 'Jean',
        last_name: 'Martin',
        email: 'jean.martin@outlook.fr',
        password: '123456',
        address: '25 avenue des Champs-Élysées', // Champs-Élysées
        city: 'Paris',
        postalCode: '75008',
        country: 'France',
        phone_number: '+33623456789',
        state: 'open',
      },
      {
        first_name: 'Sophie',
        last_name: 'Bernard',
        email: 'sophie.bernard@gmail.com',
        password: '123456',
        address: '42 rue de la Paix', // Opéra
        city: 'Paris',
        postalCode: '75002',
        country: 'France',
        phone_number: '+33634567890',
        state: 'open',
      },

      // =================================================================
      // LIVREURS AVEC ZONES DE COUVERTURE LOGIQUES
      // =================================================================
      {
        first_name: 'Ahmed',
        last_name: 'Benali',
        email: 'ahmed.benali@gmail.com',
        password: '123456',
        address: '18 rue de Belleville', // Belleville - Zone Nord-Est
        city: 'Paris',
        postalCode: '75020',
        country: 'France',
        phone_number: '+33645678901',
        state: 'open',
      },
      {
        first_name: 'Lucas',
        last_name: 'Dubois',
        email: 'lucas.dubois@gmail.com',
        password: '123456',
        address: '33 rue Saint-Germain', // Saint-Germain - Zone Sud
        city: 'Paris',
        postalCode: '75006',
        country: 'France',
        phone_number: '+33656789012',
        state: 'open',
      },
      {
        first_name: 'Fatima',
        last_name: 'Alaoui',
        email: 'fatima.alaoui@gmail.com',
        password: '123456',
        address: '8 rue de la République', // République - Zone Centre
        city: 'Paris',
        postalCode: '75011',
        country: 'France',
        phone_number: '+33667890123',
        state: 'open',
      },

      // =================================================================
      // PRESTATAIRES DE SERVICES
      // =================================================================
      {
        first_name: 'Isabelle',
        last_name: 'Moreau',
        email: 'isabelle.moreau@services.fr',
        password: '123456',
        address: '55 rue de Rennes', // Montparnasse - Transport médical
        city: 'Paris',
        postalCode: '75006',
        country: 'France',
        phone_number: '+33678901234',
        state: 'open',
      },
      {
        first_name: 'Thomas',
        last_name: 'Petit',
        email: 'thomas.petit@menage.fr',
        password: '123456',
        address: '12 place des Vosges', // Marais - Services ménagers
        city: 'Paris',
        postalCode: '75004',
        country: 'France',
        phone_number: '+33689012345',
        state: 'open',
      },

      // =================================================================
      // COMMERÇANTS
      // =================================================================
      {
        first_name: 'François',
        last_name: 'Leblanc',
        email: 'contact@epicerie-montmartre.fr',
        password: '123456',
        address: '28 rue des Abbesses', // Montmartre
        city: 'Paris',
        postalCode: '75018',
        country: 'France',
        phone_number: '+33690123456',
        state: 'open',
      },
      {
        first_name: 'Nathalie',
        last_name: 'Rousseau',
        email: 'contact@patisserie-marais.fr',
        password: '123456',
        address: '16 rue des Rosiers', // Marais
        city: 'Paris',
        postalCode: '75004',
        country: 'France',
        phone_number: '+33601234567',
        state: 'open',
      },
    ]

    // Créer les utilisateurs
    for (const userData of users) {
      await Utilisateurs.create(userData)
    }

    console.log('✅ 11 utilisateurs créés avec des adresses parisiennes logiques')
  }
}
