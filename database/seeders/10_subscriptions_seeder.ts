import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Récupérer tous les utilisateurs
    const allUsers = await Utilisateurs.all()
    
    if (allUsers.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données')
      return
    }

    // Récupérer les utilisateurs qui ont déjà un abonnement
    const existingSubscriptions = await this.client
      .from('subscriptions')
      .select('utilisateur_id')
    
    const usersWithSubscriptions = new Set(existingSubscriptions.map(sub => sub.utilisateur_id))

    // Créer des abonnements pour les utilisateurs qui n'en ont pas
    const subscriptions = []
    const currentDate = new Date()

    // Définir des abonnements spéciaux pour certains utilisateurs (par email)
    const specialSubscriptions = {
      'jean.martin@outlook.fr': { type: 'starter', price: 9.9, endDate: new Date('2025-11-15') },
      'ahmed.benali@gmail.com': { type: 'starter', price: 9.9, endDate: new Date('2025-10-01') },
      'isabelle.moreau@gmail.com': { type: 'premium', price: 19.99, endDate: new Date('2025-09-01') },
      'thomas.petit@services.fr': { type: 'starter', price: 9.9, endDate: new Date('2025-11-01') },
      'contact@epiceriefine-paris.fr': { type: 'premium', price: 19.99, endDate: new Date('2025-08-01') },
      'contact@savons-paris.fr': { type: 'premium', price: 19.99, endDate: new Date('2025-07-15') }
    }

    for (const user of allUsers) {
      // Ignorer les utilisateurs qui ont déjà un abonnement
      if (usersWithSubscriptions.has(user.id)) {
        continue
      }

      // Vérifier s'il y a un abonnement spécial pour cet utilisateur
      const specialSub = specialSubscriptions[user.email as keyof typeof specialSubscriptions]
      
      if (specialSub) {
        subscriptions.push({
          utilisateur_id: user.id,
          subscription_type: specialSub.type,
          monthly_price: specialSub.price,
          status: 'active',
          start_date: currentDate,
          end_date: specialSub.endDate,
          created_at: currentDate,
          updated_at: currentDate,
        })
      } else {
        // Abonnement gratuit par défaut pour tous les autres utilisateurs
        subscriptions.push({
          utilisateur_id: user.id,
          subscription_type: 'free',
          monthly_price: 0.0,
          status: 'active',
          start_date: currentDate,
          end_date: null, // Free n'expire jamais
          created_at: currentDate,
          updated_at: currentDate,
        })
      }
    }

    if (subscriptions.length > 0) {
      await this.client.table('subscriptions').insert(subscriptions)
      console.log(
        `✅ ${subscriptions.length} abonnements créés avec succès pour tous les utilisateurs`
      )
      console.log(`📊 Total utilisateurs: ${allUsers.length}, Nouveaux abonnements: ${subscriptions.length}, Abonnements existants: ${usersWithSubscriptions.size}`)
    } else {
      console.log('ℹ️ Tous les utilisateurs ont déjà un abonnement')
    }
  }
}
