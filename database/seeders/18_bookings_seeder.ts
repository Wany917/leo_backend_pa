import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des bookings existent déjà
    const existingBookings = await this.client.from('bookings').select('*').limit(1)
    if (existingBookings.length > 0) {
      console.log('Des bookings existent déjà, seeder ignoré')
      return
    }

    // Vérifier que les clients et services existent
    const clients = await this.client.from('clients').select('id').limit(5)
    const services = await this.client.from('services').select('id').limit(5)

    if (clients.length === 0 || services.length === 0) {
      console.log('❌ Clients ou services manquants, impossible de créer des bookings')
      return
    }

    const bookings = [
      {
        client_id: clients[0]?.id,
        service_id: services[0]?.id,
        booking_date: new Date('2025-02-15 14:00:00'),
        status: 'confirmed',
        notes: 'Première réservation test',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        client_id: clients[1]?.id,
        service_id: services[1]?.id,
        booking_date: new Date('2025-02-20 10:30:00'),
        status: 'pending',
        notes: 'En attente de confirmation',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('bookings').insert(bookings)
    console.log('✅ Bookings créés avec succès')
  }
}
