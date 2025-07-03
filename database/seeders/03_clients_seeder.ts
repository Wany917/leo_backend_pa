import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Client from '#models/client'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des clients existent déjà
    const existingClients = await Client.query().limit(1)
    if (existingClients.length > 0) {
      console.log('Des clients existent déjà, seeder ignoré')
      return
    }

    // ✅ CLIENTS BASÉS SUR LES UTILISATEURS CRÉÉS
    const clients = [
      {
        id: 2, // Marie Dupont - Rivoli
        loyalty_points: 150,
        preferred_payment_method: 'carte_bancaire',
      },
      {
        id: 3, // Jean Martin - Champs-Élysées
        loyalty_points: 250,
        preferred_payment_method: 'stripe',
      },
      {
        id: 4, // Sophie Bernard - Opéra
        loyalty_points: 50,
        preferred_payment_method: 'carte_bancaire',
      },
    ]

    for (const clientData of clients) {
      await Client.create(clientData)
    }

    console.log('✅ 3 clients créés avec des profils différents')
  }
}
