import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // D'abord créer de nouveaux utilisateurs pour les prestataires
    const prestataireUsers = [
      {
        id: 7,
        first_name: 'Isabelle',
        last_name: 'Moreau',
        email: 'isabelle.moreau@gmail.com',
        password: '123456',
        address: '30 rue de Rennes',
        city: 'Paris',
        postalCode: '75006',
        country: 'France',
        phone_number: '+33667890123',
        state: 'open',
      },
      {
        id: 8,
        first_name: 'Thomas',
        last_name: 'Petit',
        email: 'thomas.petit@services.fr',
        password: '123456',
        address: '8 place du Général de Gaulle',
        city: 'Lille',
        postalCode: '59000',
        country: 'France',
        phone_number: '+33678901234',
        state: 'open',
      },
    ]

    // ✅ Utiliser le modèle pour garantir le hachage des mots de passe
    for (const userData of prestataireUsers) {
      await Utilisateurs.create(userData)
    }

    // Créer les profils prestataires
    const prestataires = [
      {
        id: 7, // Isabelle Moreau - Transport de personnes (Paris)
        service_type: 'transport_personnes',
        rating: 4.9,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 8, // Thomas Petit - Services ménagers (Lille)
        service_type: 'services_menagers',
        rating: 4.7,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('prestataires').insert(prestataires)

    // Créer aussi leurs profils clients
    const prestataireClients = [
      {
        id: 7,
        loyalty_points: 50,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 8,
        loyalty_points: 75,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('clients').insert(prestataireClients)
  }
}
