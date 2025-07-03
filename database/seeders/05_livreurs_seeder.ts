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

    // ✅ LIVREURS AVEC ZONES DE COUVERTURE LOGIQUES À PARIS
    const livreurs = [
      {
        id: 5, // Ahmed Benali - Belleville (Zone Nord-Est)
        vehicle_type: 'velo',
        license_number: 'VL-2024-001',
        insurance_number: 'INS-AHMED-001',
        delivery_zone: JSON.stringify(['75020', '75019', '75018', '75010']), // Nord-Est Paris
        availability_status: 'available',
        average_rating: 4.8,
        total_deliveries: 156,
        is_verified: true,
      },
      {
        id: 6, // Lucas Dubois - Saint-Germain (Zone Sud)
        vehicle_type: 'scooter',
        license_number: 'SC-2024-002',
        insurance_number: 'INS-LUCAS-002',
        delivery_zone: JSON.stringify(['75006', '75007', '75014', '75015']), // Sud Paris
        availability_status: 'available',
        average_rating: 4.6,
        total_deliveries: 203,
        is_verified: true,
      },
      {
        id: 7, // Fatima Alaoui - République (Zone Centre)
        vehicle_type: 'velo',
        license_number: 'VL-2024-003',
        insurance_number: 'INS-FATIMA-003',
        delivery_zone: JSON.stringify(['75011', '75003', '75004', '75001', '75002']), // Centre Paris
        availability_status: 'available',
        average_rating: 4.9,
        total_deliveries: 89,
        is_verified: true,
      },
    ]

    for (const livreurData of livreurs) {
      await Livreur.create(livreurData)
    }

    console.log('✅ 3 livreurs créés avec zones de couverture parisiennes')
  }
}
