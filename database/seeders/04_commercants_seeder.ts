import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // D'abord créer de nouveaux utilisateurs pour les commercants
    const commercantUsers = [
      {
        id: 9,
        first_name: 'François',
        last_name: 'Dubois',
        email: 'contact@epiceriefine-paris.fr',
        password: '123456',
        address: '55 rue des Abbesses',
        city: 'Paris',
        postalCode: '75018',
        country: 'France',
        phone_number: '+33142234455',
        state: 'open',
      },
      {
        id: 10,
        first_name: 'Nathalie',
        last_name: 'Sanchez',
        email: 'contact@savons-marseille.fr',
        password: '123456',
        address: '12 cours Julien',
        city: 'Marseille',
        postalCode: '13006',
        country: 'France',
        phone_number: '+33491445566',
        state: 'open',
      },
    ]

    // ✅ Utiliser le modèle pour garantir le hachage des mots de passe
    for (const userData of commercantUsers) {
      await Utilisateurs.create(userData)
    }

    // Créer les profils commercants
    const commercants = [
      {
        id: 9, // François Dubois - Épicerie fine parisienne
        store_name: 'Épicerie Fine Montmartre',
        business_address: '55 rue des Abbesses, 75018 Paris',
        verification_state: 'verified',
        contact_number: '+33142234455',
        contract_start_date: new Date('2023-01-15'),
        contract_end_date: new Date('2024-01-15'),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 10, // Nathalie Sanchez - Savonnerie artisanale
        store_name: 'Savons de Marseille Tradition',
        business_address: '12 cours Julien, 13006 Marseille',
        verification_state: 'pending',
        contact_number: '+33491445566',
        contract_start_date: new Date('2023-06-01'),
        contract_end_date: new Date('2024-06-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('commercants').insert(commercants)

    // Créer aussi leurs profils clients
    const commercantClients = [
      {
        id: 9,
        loyalty_points: 300,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 10,
        loyalty_points: 250,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('clients').insert(commercantClients)
  }
}
