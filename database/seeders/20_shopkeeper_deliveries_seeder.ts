import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import ShopkeeperDelivery from '#models/shopkeeper_delivery'
import { DateTime } from 'luxon'

type DeliveryData = {
  commercantId: number
  customerName: string
  customerEmail: string
  customerAddress: string
  productsSummary: string
  totalWeight: number
  price: number
  trackingNumber: string
  status: 'pending_acceptance' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled'
  createdAt: DateTime
  updatedAt: DateTime
  livreurId?: number
}

export default class extends BaseSeeder {
  public async run() {
    // Récupérer les ID des commerçants et livreurs existants
    const commercants = await db.from('commercants').select('id')
    const livreurs = await db.from('livreurs').select('id')

    if (commercants.length < 2) {
      console.log('Skipping ShopkeeperDeliveriesSeeder: Not enough shopkeepers found.')
      return
    }

    const commercantId1 = commercants[0].id
    const commercantId2 = commercants[1].id

    const deliveriesToCreate: DeliveryData[] = [
      {
        commercantId: commercantId1,
        customerName: 'Alice Martin',
        customerEmail: 'alice.martin@example.com',
        customerAddress: '15 Rue de la Paix, 75002 Paris',
        productsSummary: "1x Pain, 2x Croissants, 1x Jus d'orange",
        totalWeight: 1.5,
        price: 7.5,
        trackingNumber: 'ECO-SHOP-001',
        status: 'pending_acceptance',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      },
      {
        commercantId: commercantId2,
        customerName: 'Bob Dupont',
        customerEmail: 'bob.dupont@example.com',
        customerAddress: '221B Baker Street, London NW1 6XE',
        productsSummary: 'Panier de fruits et légumes bio',
        totalWeight: 5.0,
        price: 12.0,
        trackingNumber: 'ECO-SHOP-002',
        status: 'pending_acceptance',
        createdAt: DateTime.now().minus({ minutes: 30 }),
        updatedAt: DateTime.now().minus({ minutes: 30 }),
      },
    ]

    // Ajouter une livraison acceptée seulement si un livreur existe
    if (livreurs.length > 0) {
      const livreurId1 = livreurs[0].id
      deliveriesToCreate.push({
        commercantId: commercantId1,
        customerName: 'Charlie Durand',
        customerEmail: 'charlie.durand@example.com',
        customerAddress: '1600 Amphitheatre Parkway, Mountain View, CA',
        productsSummary: 'Livres et papeterie',
        totalWeight: 2.1,
        price: 9.0,
        trackingNumber: 'ECO-SHOP-003',
        status: 'accepted',
        livreurId: livreurId1,
        createdAt: DateTime.now().minus({ hours: 2 }),
        updatedAt: DateTime.now().minus({ hours: 1 }),
      })
    } else {
      console.log('Skipping creation of accepted delivery: No deliverymen found.')
    }

    await ShopkeeperDelivery.createMany(deliveriesToCreate)

    console.log('✅ Shopkeeper deliveries seeded')
  }
}
