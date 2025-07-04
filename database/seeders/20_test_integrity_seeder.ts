import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livreur from '#models/livreur'
import Livraison from '#models/livraison'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import Client from '#models/client'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    console.log("🔍 Vérification de l'intégrité des données...")

    // Vérifier les livreurs
    const livreurs = await Livreur.query().preload('user')
    console.log(`✅ ${livreurs.length} livreurs trouvés`)

    for (const livreur of livreurs) {
      console.log(
        `  - ${livreur.user?.first_name} ${livreur.user?.last_name} (ID: ${livreur.id}) - Status: ${livreur.availabilityStatus}, Rating: ${livreur.rating}`
      )
    }

    // Vérifier les livraisons
    const livraisons = await Livraison.query().preload('livreur').preload('client')
    console.log(`✅ ${livraisons.length} livraisons trouvées`)

    const statusCounts = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    }

    for (const livraison of livraisons) {
      statusCounts[livraison.status]++
      const livreurName = livraison.livreur
        ? `${livraison.livreur.user?.first_name} ${livraison.livreur.user?.last_name}`
        : 'Non assigné'
      const clientName = livraison.client
        ? `${livraison.client.user?.first_name} ${livraison.client.user?.last_name}`
        : 'Client inconnu'
      console.log(
        `  - Livraison ${livraison.id}: ${clientName} → ${livreurName} (${livraison.status}) - ${livraison.price}€`
      )
    }

    console.log(`  📊 Répartition: ${JSON.stringify(statusCounts)}`)

    // Vérifier les portefeuilles
    const portefeuilles = await PortefeuilleEcodeli.query().preload('utilisateur')
    console.log(`✅ ${portefeuilles.length} portefeuilles trouvés`)

    for (const portefeuille of portefeuilles) {
      const userName = `${portefeuille.utilisateur?.first_name} ${portefeuille.utilisateur?.last_name}`
      console.log(
        `  - ${userName}: ${portefeuille.soldeDisponible}€ disponible, ${portefeuille.soldeEnAttente}€ en attente`
      )
    }

    // Vérifier les clients
    const clients = await Client.query().preload('user')
    console.log(`✅ ${clients.length} clients trouvés`)

    for (const client of clients) {
      const userName = `${client.user?.first_name} ${client.user?.last_name}`
      console.log(
        `  - ${userName}: ${client.loyalty_points} points, paiement: ${client.preferred_payment_method}`
      )
    }

    // Vérifier les utilisateurs
    const utilisateurs = await Utilisateurs.query()
    console.log(`✅ ${utilisateurs.length} utilisateurs trouvés`)

    const userTypes = {
      admin: 0,
      client: 0,
      livreur: 0,
      prestataire: 0,
      commercant: 0,
    }

    for (const user of utilisateurs) {
      if (user.email.includes('admin')) userTypes.admin++
      else if (user.email.includes('gmail.com') && user.id <= 4) userTypes.client++
      else if (user.email.includes('gmail.com') && user.id >= 5 && user.id <= 7) userTypes.livreur++
      else if (user.email.includes('services') || user.email.includes('menage'))
        userTypes.prestataire++
      else if (user.email.includes('epicerie') || user.email.includes('patisserie'))
        userTypes.commercant++
    }

    console.log(`  📊 Types d'utilisateurs: ${JSON.stringify(userTypes)}`)

    console.log("✅ Vérification de l'intégrité terminée avec succès")
  }
}
