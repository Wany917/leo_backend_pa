import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des complaints existent déjà
    const existingComplaints = await this.client.from('complaints').select('*').limit(1)
    if (existingComplaints.length > 0) {
      console.log('Des complaints existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES UTILISATEURS PAR EMAIL PLUTÔT QUE PAR ID FIXE
    const emma = await Utilisateurs.findBy('email', 'emma.dubois@email-test.fr')
    const antoine = await Utilisateurs.findBy('email', 'antoine.martin@fakemail.fr')
    const pierre = await Utilisateurs.findBy('email', 'pierre.durand@livreur-test.fr')

    if (!emma || !antoine || !pierre) {
      console.log('❌ Utilisateurs non trouvés pour les complaints, seeder ignoré')
      return
    }

    const now = DateTime.now().toJSDate()
    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const lastWeek = DateTime.now().minus({ days: 7 }).toJSDate()

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const complaints = [
      {
        utilisateur_id: emma!.id,
        subject: 'Emballage déchiré',
        description: "Le colis est arrivé avec l'emballage partiellement déchiré, contenu intact.",
        status: 'open',
        priority: 'medium',
        related_order_id: null,
        admin_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        utilisateur_id: emma!.id,
        subject: 'Retard de livraison',
        description: "La livraison prévue hier n'est toujours pas arrivée.",
        status: 'in_progress',
        priority: 'high',
        related_order_id: null,
        admin_notes: 'Livreur contacté',
        created_at: yesterday,
        updated_at: now,
      },
      {
        utilisateur_id: antoine!.id,
        subject: 'Montant facturé incorrect',
        description: 'Différence de 10€ par rapport au devis.',
        status: 'resolved',
        priority: 'medium',
        related_order_id: null,
        admin_notes: 'Ajustement effectué',
        created_at: lastWeek,
        updated_at: yesterday,
      },
      {
        utilisateur_id: pierre!.id,
        subject: 'Mauvaise adresse de livraison',
        description: 'Le colis a été livré à la mauvaise porte.',
        status: 'closed',
        priority: 'urgent',
        related_order_id: null,
        admin_notes: 'Colis récupéré et livré correctement',
        created_at: lastWeek,
        updated_at: yesterday,
      },
    ]

    await this.client.table('complaints').insert(complaints)
    console.log(`✅ ${complaints.length} complaints créées avec succès avec auto-incrémentation`)
  }
}
