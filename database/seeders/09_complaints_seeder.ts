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
    const marie = await Utilisateurs.findBy('email', 'marie.dupont@gmail.com')
    const jean = await Utilisateurs.findBy('email', 'jean.martin@outlook.fr')
    const ahmed = await Utilisateurs.findBy('email', 'ahmed.benali@gmail.com')

    if (!marie || !jean || !ahmed) {
      console.log('❌ Utilisateurs non trouvés pour les complaints, seeder ignoré')
      return
    }

    const now = DateTime.now().toJSDate()
    const yesterday = DateTime.now().minus({ days: 1 }).toJSDate()
    const lastWeek = DateTime.now().minus({ days: 7 }).toJSDate()

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const complaints = [
      {
        utilisateur_id: marie.id, // Marie Dupont - ID dynamique
        subject: 'Colis endommagé',
        description:
          "Mon colis est arrivé endommagé avec des traces d'écrasement. Le contenu est intact mais l'emballage est abîmé.",
        status: 'open',
        priority: 'medium',
        related_order_id: null, // Pas de référence fixe
        image_path: null,
        admin_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        utilisateur_id: marie.id, // Marie Dupont - ID dynamique
        subject: 'Retard important de livraison',
        description:
          "Ma livraison était prévue hier et n'est toujours pas arrivée. Je n'ai reçu aucune information concernant ce retard.",
        status: 'in_progress',
        priority: 'high',
        related_order_id: null, // Pas de référence fixe
        image_path: null,
        admin_notes: 'Livreur contacté, problème de véhicule signalé',
        created_at: yesterday,
        updated_at: now,
      },
      {
        utilisateur_id: jean.id, // Jean Martin - ID dynamique
        subject: 'Facturation incorrecte',
        description:
          'Le montant facturé ne correspond pas au devis initial. Il y a une différence de 15€ sans explication.',
        status: 'resolved',
        priority: 'medium',
        related_order_id: null, // Pas de référence fixe
        image_path: null,
        admin_notes: 'Remboursement de la différence effectué',
        created_at: lastWeek,
        updated_at: yesterday,
      },
      {
        utilisateur_id: ahmed.id, // Ahmed Benali - ID dynamique
        subject: "Erreur d'adresse de livraison",
        description:
          "Mon colis a été livré à la mauvaise adresse. L'adresse inscrite était correcte mais le livreur s'est trompé.",
        status: 'closed',
        priority: 'urgent',
        related_order_id: null, // Pas de référence fixe
        image_path: null,
        admin_notes: 'Colis récupéré et livré à la bonne adresse avec compensation',
        created_at: lastWeek,
        updated_at: yesterday,
      },
    ]

    await this.client.table('complaints').insert(complaints)
    console.log(`✅ ${complaints.length} complaints créées avec succès avec auto-incrémentation`)
  }
}
