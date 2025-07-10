import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { cuid } from '@adonisjs/core/helpers'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {
    console.log('🌱 Génération des données de test pour les livraisons de commerçant...')

    // Récupérer des commerçants existants
    const commercants = await db.from('commercants').limit(3)

    if (commercants.length === 0) {
      console.log('⚠️ Aucun commerçant trouvé - création de données de test ignorée')
      return
    }

    // Récupérer des livreurs existants
    const livreurs = await db.from('livreurs').limit(3)

    const testDeliveries = [
      {
        commercant_id: commercants[0].id,
        livreur_id: livreurs.length > 0 ? livreurs[0].id : null,
        customer_name: 'Marie Dubois',
        customer_email: 'marie.dubois@email.com',
        customer_address: '123 Rue de la Paix, 75001 Paris',
        products_summary: 'Commande de vêtements (2 articles)',
        total_weight: 1.5,
        status: livreurs.length > 0 ? 'accepted' : 'pending_acceptance',
        tracking_number: `ECO-SHOP-${cuid()}`,
        price: 12.5,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        commercant_id: commercants[0].id,
        livreur_id: livreurs.length > 1 ? livreurs[1].id : null,
        customer_name: 'Jean Martin',
        customer_email: 'jean.martin@email.com',
        customer_address: '456 Avenue des Champs, 69001 Lyon',
        products_summary: 'Livre "Clean Architecture" + accessoires',
        total_weight: 0.8,
        status: livreurs.length > 1 ? 'in_transit' : 'pending_acceptance',
        tracking_number: `ECO-SHOP-${cuid()}`,
        price: 15.0,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2 heures
        updated_at: new Date(),
      },
      {
        commercant_id: commercants.length > 1 ? commercants[1].id : commercants[0].id,
        livreur_id: livreurs.length > 2 ? livreurs[2].id : null,
        customer_name: 'Sophie Leroy',
        customer_email: 'sophie.leroy@email.com',
        customer_address: '789 Boulevard Saint-Germain, 33000 Bordeaux',
        products_summary: 'Casque audio Bluetooth + câbles',
        total_weight: 2.1,
        status: livreurs.length > 2 ? 'delivered' : 'pending_acceptance',
        tracking_number: `ECO-SHOP-${cuid()}`,
        price: 18.75,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
        updated_at: new Date(),
      },
      {
        commercant_id: commercants[0].id,
        livreur_id: null,
        customer_name: 'Pierre Durand',
        customer_email: 'pierre.durand@email.com',
        customer_address: '321 Rue du Commerce, 13001 Marseille',
        products_summary: 'Chaussures de sport Nike Air Max',
        total_weight: 1.2,
        status: 'pending_acceptance',
        tracking_number: `ECO-SHOP-${cuid()}`,
        price: 14.25,
        created_at: new Date(Date.now() - 30 * 60 * 1000), // Il y a 30 minutes
        updated_at: new Date(),
      },
      {
        commercant_id: commercants.length > 2 ? commercants[2].id : commercants[0].id,
        livreur_id: null,
        customer_name: 'Emma Rousseau',
        customer_email: 'emma.rousseau@email.com',
        customer_address: '654 Place de la République, 31000 Toulouse',
        products_summary: 'Produits cosmétiques bio (3 articles)',
        total_weight: 0.9,
        status: 'cancelled',
        tracking_number: `ECO-SHOP-${cuid()}`,
        price: 11.5,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Il y a 3 jours
        updated_at: new Date(),
      },
    ]

    // Insérer les données de test
    await db.table('shopkeeper_deliveries').insert(testDeliveries)

    // Créer les colis associés
    for (const delivery of testDeliveries) {
      await db.table('colis').insert({
        annonce_id: null,
        tracking_number: delivery.tracking_number,
        weight: delivery.total_weight,
        length: 20,
        width: 15,
        height: 10,
        content_description: delivery.products_summary,
        status:
          delivery.status === 'delivered'
            ? 'delivered'
            : delivery.status === 'cancelled'
              ? 'lost' // ✅ 'cancelled' n'existe pas pour colis, on utilise 'lost'
              : delivery.status === 'in_transit'
                ? 'in_transit' // ✅ Corrigé: 'in_progress' → 'in_transit'
                : 'stored',
        location_type: 'warehouse',
        current_address:
          delivery.status === 'delivered' ? delivery.customer_address : 'Entrepôt EcoDeli',
        created_at: delivery.created_at,
        updated_at: delivery.updated_at,
      })
    }

    console.log(`✅ ${testDeliveries.length} livraisons de test créées avec succès`)
  }
}
