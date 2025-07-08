import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'
// Le hachage sera appliqué automatiquement par le hook @beforeSave du modèle Utilisateurs

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des utilisateurs existent déjà
    const existingUsers = await Utilisateurs.query().limit(1)
    if (existingUsers.length > 0) {
      console.log('Des utilisateurs existent déjà, seeder ignoré')
      return
    }

    // ✅ UTILISATEURS ECODELI - DONNÉES RÉALISTES AVEC EMAILS FACTICES
    const users = [
      // =================================================================
      // 👨‍💼 ADMINISTRATEUR - Siège EcoDeli
      // =================================================================
      {
        first_name: 'Sylvain',
        last_name: 'Levy',
        email: 'sylvain.levy@ecodeli-test.fr', // Email factice
        password: '123456',
        address: '110 rue de Flandre', // Siège réel EcoDeli selon cahier des charges
        city: 'Paris',
        postal_code: '75019',
        country: 'France',
        phone_number: '+33142030000',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },

      // =================================================================
      // 👥 CLIENTS - Utilisateurs finaux EcoDeli
      // =================================================================
      {
        first_name: 'Emma',
        last_name: 'Dubois',
        email: 'emma.dubois@email-test.fr',
        password: '123456',
        address: '45 Boulevard Richard-Lenoir',
        city: 'Paris',
        postal_code: '75011',
        country: 'France',
        phone_number: '+33145232841',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Antoine',
        last_name: 'Martin',
        email: 'antoine.martin@fakemail.fr',
        password: '123456',
        address: '23 Rue de Belleville',
        city: 'Paris',
        postal_code: '75019',
        country: 'France',
        phone_number: '+33142589634',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: false, // Préfère emails
      },
      {
        first_name: 'Sophie',
        last_name: 'Bernard',
        email: 'sophie.bernard@testmail.com',
        password: '123456',
        address: '18 Avenue du Maine',
        city: 'Paris',
        postal_code: '75015',
        country: 'France',
        phone_number: '+33145674523',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Julien',
        last_name: 'Leroy',
        email: 'julien.leroy@fakemail.org',
        password: '123456',
        address: '34 Rue du Faubourg Saint-Martin',
        city: 'Paris',
        postal_code: '75010',
        country: 'France',
        phone_number: '+33142678945',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Marie',
        last_name: 'Dufour',
        email: 'marie.dufour@email-test.com',
        password: '123456',
        address: '8 Rue du Temple',
        city: 'Paris',
        postal_code: '75004',
        country: 'France',
        phone_number: '+33148562378',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: false, // Notifications désactivées
        email_notifications_enabled: true,
      },
      {
        first_name: 'Lucas',
        last_name: 'Moreau',
        email: 'lucas.moreau@testmail.org',
        password: '123456',
        address: '12 Rue de la Roquette',
        city: 'Paris',
        postal_code: '75011',
        country: 'France',
        phone_number: '+33143789652',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },

      // =================================================================
      // 🚚 LIVREURS - Crowdshippers EcoDeli
      // =================================================================
      {
        first_name: 'Pierre',
        last_name: 'Durand',
        email: 'pierre.durand@livreur-test.fr',
        password: '123456',
        address: '25 Rue Saint-Antoine',
        city: 'Paris',
        postal_code: '75004',
        country: 'France',
        phone_number: '+33145896741',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Julie',
        last_name: 'Moreau',
        email: 'julie.moreau@livreurfake.com',
        password: '123456',
        address: '67 Rue de Charonne',
        city: 'Paris',
        postal_code: '75011',
        country: 'France',
        phone_number: '+33142567893',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Alex',
        last_name: 'Bernard',
        email: 'alex.bernard@livreur-test.org',
        password: '123456',
        address: '89 Avenue de la République',
        city: 'Paris',
        postal_code: '75011',
        country: 'France',
        phone_number: '+33148567234',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },

      // =================================================================
      // 👩‍💼 PRESTATAIRES - Services à la personne
      // =================================================================
      {
        first_name: 'Isabelle',
        last_name: 'Cohen',
        email: 'isabelle.cohen@prestafake.fr',
        password: '123456',
        address: '34 Rue de Turenne',
        city: 'Paris',
        postal_code: '75003',
        country: 'France',
        phone_number: '+33142345678',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Thomas',
        last_name: 'Roux',
        email: 'thomas.roux@servicefake.com',
        password: '123456',
        address: '56 Boulevard Voltaire',
        city: 'Paris',
        postal_code: '75011',
        country: 'France',
        phone_number: '+33143456789',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Sandra',
        last_name: 'Petit',
        email: 'sandra.petit@pretafake.org',
        password: '123456',
        address: '78 Rue de Rivoli',
        city: 'Paris',
        postal_code: '75001',
        country: 'France',
        phone_number: '+33144567890',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },

      // =================================================================
      // 🏪 COMMERÇANTS - Partenaires EcoDeli
      // =================================================================
      {
        first_name: 'David',
        last_name: 'Garcia',
        email: 'david.garcia@commercant-test.fr',
        password: '123456',
        address: '90 Avenue des Champs-Élysées',
        city: 'Paris',
        postal_code: '75008',
        country: 'France',
        phone_number: '+33145678901',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
      {
        first_name: 'Nadia',
        last_name: 'Benali',
        email: 'nadia.benali@commercantfake.com',
        password: '123456',
        address: '12 Place des Vosges',
        city: 'Paris',
        postal_code: '75004',
        country: 'France',
        phone_number: '+33146789012',
        state: 'open',
        preferred_language: 'fr',
        push_notifications_enabled: true,
        email_notifications_enabled: true,
      },
    ]

    // ✅ CRÉER LES UTILISATEURS AVEC GESTION D'ERREURS
    for (const userData of users) {
      try {
        await Utilisateurs.create(userData)
        console.log(
          `✅ Utilisateur créé: ${userData.first_name} ${userData.last_name} (${userData.email})`
        )
      } catch (error) {
        console.log(`❌ Erreur création ${userData.email}:`, error.message)
      }
    }

    console.log(`✅ ${users.length} utilisateurs EcoDeli créés avec mots de passe hashés`)
  }
}
