import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des prestataires existent déjà
    const existingPrestataires = await this.client.from('prestataires').select('*').limit(1)
    if (existingPrestataires.length > 0) {
      console.log('Des prestataires existent déjà, seeder ignoré')
      return
    }

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const prestataireUsers = [
      {
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

    // Créer les utilisateurs et récupérer leurs IDs générés automatiquement
    const createdUsers = []
    for (const userData of prestataireUsers) {
      const user = await Utilisateurs.create(userData)
      createdUsers.push(user)
    }

    console.log(
      `✅ Utilisateurs prestataires créés avec IDs: ${createdUsers.map((u) => u.id).join(', ')}`
    )

    // Créer les profils prestataires avec les vrais IDs
    const prestataires = [
      {
        id: createdUsers[0].id, // Isabelle Moreau - ID automatique
        service_type: 'transport_personnes',
        rating: 4.9,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: createdUsers[1].id, // Thomas Petit - ID automatique
        service_type: 'services_menagers',
        rating: 4.7,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('prestataires').insert(prestataires)

    // Créer aussi leurs profils clients avec les vrais IDs
    const prestataireClients = [
      {
        id: createdUsers[0].id,
        loyalty_points: 50,
        preferred_payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: createdUsers[1].id,
        loyalty_points: 75,
        preferred_payment_method: 'credit_card',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('clients').insert(prestataireClients)
    console.log('✅ Prestataires créés avec succès avec auto-incrémentation')
  }
}
