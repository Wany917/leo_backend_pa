import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des commercants existent déjà
    const existingCommercants = await this.client.from('commercants').select('*').limit(1)
    if (existingCommercants.length > 0) {
      console.log('Des commercants existent déjà, seeder ignoré')
      return
    }

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const commercantUsers = [
      {
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
        first_name: 'Nathalie',
        last_name: 'Sanchez',
        email: 'contact@savons-paris.fr',
        password: '123456',
        address: '12 rue de Turenne',
        city: 'Paris',
        postalCode: '75004',
        country: 'France',
        phone_number: '+33144776655',
        state: 'open',
      },
    ]

    // Créer les utilisateurs et récupérer leurs IDs générés automatiquement
    const createdUsers = []
    for (const userData of commercantUsers) {
      const user = await Utilisateurs.create(userData)
      createdUsers.push(user)
    }

    console.log(
      `✅ Utilisateurs commercants créés avec IDs: ${createdUsers.map((u) => u.id).join(', ')}`
    )

    // Créer les profils commercants avec les vrais IDs
    const commercants = [
      {
        id: createdUsers[0].id, // François Dubois - ID automatique
        store_name: 'Épicerie Fine Montmartre',
        business_address: '55 rue des Abbesses, 75018 Paris',
        verification_state: 'verified',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: createdUsers[1].id, // Nathalie Sanchez - ID automatique
        store_name: 'Savons de Paris Tradition',
        business_address: '12 rue de Turenne, 75004 Paris',
        verification_state: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('commercants').insert(commercants)

    // Créer aussi leurs profils clients avec les vrais IDs
    const commercantClients = [
      {
        id: createdUsers[0].id,
        loyalty_points: 300,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: createdUsers[1].id,
        loyalty_points: 250,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('clients').insert(commercantClients)
    console.log('✅ Commercants créés avec succès avec auto-incrémentation')
  }
}
