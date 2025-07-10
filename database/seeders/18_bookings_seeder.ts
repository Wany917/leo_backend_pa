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
    const clients = await this.client.from('clients').select('id').limit(6)
    const services = await this.client.from('services').select('id').limit(6)

    if (clients.length === 0 || services.length === 0) {
      console.log('❌ Clients ou services manquants, impossible de créer des bookings')
      return
    }

    const now = new Date()
    const bookings = [
      {
        client_id: clients[0]?.id,
        service_id: services[0]?.id,
        booking_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
        notes: 'Réservation en attente de validation',
        created_at: now,
        updated_at: now,
        total_price: 100.0,
      },
      {
        client_id: clients[1]?.id,
        service_id: services[1]?.id,
        booking_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'confirmed',
        notes: 'Prestataire confirmé',
        created_at: now,
        updated_at: now,
        total_price: 60.0,
      },
      {
        client_id: clients[2]?.id,
        service_id: services[2]?.id,
        booking_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: 'completed',
        notes: 'Prestation terminée avec succès',
        created_at: now,
        updated_at: now,
        total_price: 60.0,
      },
      {
        client_id: clients[3]?.id,
        service_id: services[3]?.id,
        booking_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        status: 'cancelled',
        notes: 'Client a annulé la réservation',
        created_at: now,
        updated_at: now,
        total_price: 60.0,
      },
    ]

    await this.client.table('bookings').insert(bookings.filter((b) => b.client_id && b.service_id))
    console.log(`✅ ${bookings.length} bookings créés avec succès`)
  }
}
