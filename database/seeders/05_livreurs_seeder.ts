import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livreur from '#models/livreur'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des livreurs existent déjà
    const existingLivreurs = await Livreur.query().limit(1)
    if (existingLivreurs.length > 0) {
      console.log('Des livreurs existent déjà, seeder ignoré')
      return
    }

    const livreurs = [
      {
        id: 5, // Ahmed Benali - Belleville (Zone Nord-Est)
        availabilityStatus: 'available' as const,
        rating: 4.8,
      },
      {
        id: 6, // Lucas Dubois - Saint-Germain (Zone Sud)
        availabilityStatus: 'available' as const,
        rating: 4.6,
      },
      {
        id: 7, // Fatima Alaoui - République (Zone Centre)
        availabilityStatus: 'available' as const,
        rating: 4.9,
      },
    ]

    for (const livreurData of livreurs) {
      await Livreur.create(livreurData)
    }

    console.log('✅ 3 livreurs créés avec statuts et notes cohérents')
  }
}
