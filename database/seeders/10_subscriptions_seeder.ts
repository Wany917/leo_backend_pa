import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des subscriptions existent déjà
    const existingSubscriptions = await this.client.from('subscriptions').select('*').limit(1)
    if (existingSubscriptions.length > 0) {
      console.log('Des subscriptions existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES UTILISATEURS PAR EMAIL PLUTÔT QUE PAR ID FIXE
    const marie = await Utilisateurs.findBy('email', 'marie.dupont@gmail.com')
    const jean = await Utilisateurs.findBy('email', 'jean.martin@outlook.fr')
    const ahmed = await Utilisateurs.findBy('email', 'ahmed.benali@gmail.com')
    const sophie = await Utilisateurs.findBy('email', 'sophie.rousseau@laposte.net')
    const isabelle = await Utilisateurs.findBy('email', 'isabelle.moreau@gmail.com')
    const thomas = await Utilisateurs.findBy('email', 'thomas.petit@services.fr')
    const francois = await Utilisateurs.findBy('email', 'contact@epiceriefine-paris.fr')
    const nathalie = await Utilisateurs.findBy('email', 'contact@savons-marseille.fr')

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const subscriptions = []

    // Clients avec abonnement Free/Starter
    if (marie) {
      subscriptions.push({
        utilisateur_id: marie.id, // Marie Dupont - ID dynamique
        subscription_type: 'free',
        monthly_price: 0.0,
        status: 'active',
        start_date: new Date('2024-12-01'),
        end_date: null, // Free n'expire jamais
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    if (jean) {
      subscriptions.push({
        utilisateur_id: jean.id, // Jean Martin - ID dynamique
        subscription_type: 'starter',
        monthly_price: 9.9,
        status: 'active',
        start_date: new Date('2024-11-15'),
        end_date: new Date('2025-11-15'),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    // Livreurs avec abonnement Starter pour visibilité
    if (ahmed) {
      subscriptions.push({
        utilisateur_id: ahmed.id, // Ahmed Benali - ID dynamique
        subscription_type: 'starter',
        monthly_price: 9.9,
        status: 'active',
        start_date: new Date('2024-10-01'),
        end_date: new Date('2025-10-01'),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    if (sophie) {
      subscriptions.push({
        utilisateur_id: sophie.id, // Sophie Rousseau - ID dynamique
        subscription_type: 'free',
        monthly_price: 0.0,
        status: 'active',
        start_date: new Date('2024-12-10'),
        end_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    // Prestataires avec Premium pour services avancés
    if (isabelle) {
      subscriptions.push({
        utilisateur_id: isabelle.id, // Isabelle Moreau - ID dynamique
        subscription_type: 'premium',
        monthly_price: 19.99,
        status: 'active',
        start_date: new Date('2024-09-01'),
        end_date: new Date('2025-09-01'),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    if (thomas) {
      subscriptions.push({
        utilisateur_id: thomas.id, // Thomas Petit - ID dynamique
        subscription_type: 'starter',
        monthly_price: 9.9,
        status: 'active',
        start_date: new Date('2024-11-01'),
        end_date: new Date('2025-11-01'),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    // Commercants avec Premium pour business features
    if (francois) {
      subscriptions.push({
        utilisateur_id: francois.id, // François Dubois - ID dynamique
        subscription_type: 'premium',
        monthly_price: 19.99,
        status: 'active',
        start_date: new Date('2024-08-01'),
        end_date: new Date('2025-08-01'),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    if (nathalie) {
      subscriptions.push({
        utilisateur_id: nathalie.id, // Nathalie Sanchez - ID dynamique
        subscription_type: 'premium',
        monthly_price: 19.99,
        status: 'active',
        start_date: new Date('2024-07-15'),
        end_date: new Date('2025-07-15'),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    if (subscriptions.length > 0) {
      await this.client.table('subscriptions').insert(subscriptions)
      console.log(
        `✅ ${subscriptions.length} subscriptions créées avec succès avec auto-incrémentation`
      )
    } else {
      console.log('❌ Aucun utilisateur trouvé pour créer des subscriptions')
    }
  }
}
