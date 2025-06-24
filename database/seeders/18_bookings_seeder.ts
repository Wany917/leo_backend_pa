import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    const bookings = [
      // Réservation confirmée - Transport médical
      {
        id: 1,
        client_id: 12, // Charlotte Lefebvre
        service_id: 1, // Transport médical sécurisé par Isabelle Moreau
        booking_date: DateTime.now().plus({ days: 4 }).toISO(),
        status: 'confirmed',
        notes: "RDV à 14h30 au CHU Lille. Ma mère a besoin d'aide pour marcher.",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Réservation en attente - Ménage hebdomadaire
      {
        id: 2,
        client_id: 13, // Alexandre Girard
        service_id: 3, // Ménage hebdomadaire par Thomas Petit
        booking_date: DateTime.now().plus({ weeks: 1 }).toISO(),
        status: 'pending',
        notes: "Appartement 75m², 3 pièces. Présence d'un chat.",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Réservation complétée - Garde de chat
      {
        id: 3,
        client_id: 13, // Alexandre Girard
        service_id: 5, // Garde de chat à domicile par Camille Robert
        booking_date: DateTime.now().minus({ days: 3 }).toISO(),
        status: 'completed',
        notes: 'Chat très calme, nourriture dans le placard de la cuisine.',
        created_at: DateTime.now().minus({ days: 10 }).toJSDate(),
        updated_at: DateTime.now().minus({ days: 3 }).toJSDate(),
      },

      // Réservation confirmée - Courses au marché
      {
        id: 4,
        client_id: 14, // Emma Blanc
        service_id: 7, // Courses au marché par Julien Garcia
        booking_date: DateTime.now().plus({ days: 5 }).toISO(),
        status: 'confirmed',
        notes: 'Budget 80€. Liste : légumes de saison, fruits, fromage de chèvre, pain complet.',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Réservation annulée - Navette aéroport
      {
        id: 5,
        client_id: 4, // Jean Martin
        service_id: 2, // Navette aéroport par Isabelle Moreau
        booking_date: DateTime.now().plus({ days: 2 }).toISO(),
        status: 'cancelled',
        notes: 'Vol annulé - voyage reporté',
        created_at: DateTime.now().minus({ days: 1 }).toJSDate(),
        updated_at: new Date(),
      },

      // Réservation en cours - Transport urgent hôpital
      {
        id: 6,
        client_id: 3, // Marie Dupont
        service_id: 9, // Transport urgent hôpital (service en cours)
        booking_date: DateTime.now().toISO(),
        status: 'confirmed',
        notes: 'Urgence médicale - Examen prévu à 11h',
        created_at: DateTime.now().minus({ hours: 3 }).toJSDate(),
        updated_at: new Date(),
      },

      // Réservation future - Promenade canine
      {
        id: 7,
        client_id: 13, // Alexandre Girard
        service_id: 6, // Promenade canine par Camille Robert
        booking_date: DateTime.now().plus({ days: 7 }).toISO(),
        status: 'pending',
        notes: "Golden Retriever, très sociable. Préfère le Parc de la Tête d'Or.",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Réservation récurrente simulée - Ménage
      {
        id: 8,
        client_id: 4, // Jean Martin
        service_id: 3, // Ménage hebdomadaire
        booking_date: DateTime.now().plus({ weeks: 2 }).toISO(),
        status: 'confirmed',
        notes: 'Service récurrent tous les vendredis matin',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Réservation complétée - Grand ménage
      {
        id: 9,
        client_id: 12, // Charlotte Lefebvre
        service_id: 4, // Grand ménage de printemps
        booking_date: DateTime.now().minus({ weeks: 2 }).toISO(),
        status: 'completed',
        notes: 'Très satisfaite du service. Appartement impeccable !',
        created_at: DateTime.now().minus({ weeks: 3 }).toJSDate(),
        updated_at: DateTime.now().minus({ weeks: 2 }).toJSDate(),
      },

      // Réservation en attente - Courses supermarché
      {
        id: 10,
        client_id: 14, // Emma Blanc
        service_id: 8, // Courses supermarché + livraison
        booking_date: DateTime.now().plus({ days: 3 }).toISO(),
        status: 'pending',
        notes: 'Liste détaillée à envoyer la veille. Paiement par CB.',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('bookings').insert(bookings)
  }
}
