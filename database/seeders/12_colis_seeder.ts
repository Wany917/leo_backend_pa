import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Colis from '#models/colis'
import Annonce from '#models/annonce'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des colis existent déjà
    const existingColis = await Colis.query().limit(1)
    if (existingColis.length > 0) {
      console.log('Des colis existent déjà, seeder ignoré')
      return
    }

    // ✅ COLIS CORRESPONDANT AUX ANNONCES CRÉÉES
    const annonceDocs = await Annonce.findBy(
      'title',
      'Livraison urgente documents légaux République - Bastille'
    )
    const annonceFnac = await Annonce.findBy(
      'title',
      'Récupération commande Fnac Châtelet → Belleville'
    )
    const annonceMed = await Annonce.findBy('title', "Transport oeuvre d'art Marais → Montparnasse")

    const colis = [
      {
        annonceId: annonceDocs?.id,
        trackingNumber: 'ECO-DOC-2025-001',
        contentDescription: 'Enveloppe A4 contenant documents notariaux urgents',
        length: 32,
        width: 22,
        height: 2,
        weight: 0.3,
        status: 'stored' as const,
        locationType: 'warehouse' as const,
        locationId: 1,
        currentAddress: 'EcoDeli Paris Nord - 10 Avenue du Général de Gaulle, 93500 Pantin',
      },
      {
        annonceId: annonceFnac?.id,
        trackingNumber: 'ECO-FNAC-2025-002',
        contentDescription: 'Ordinateur portable Dell XPS',
        length: 40,
        width: 30,
        height: 15,
        weight: 2.0,
        status: 'stored' as const,
        locationType: 'client_address' as const,
        locationId: null,
        currentAddress: '23 Rue de Belleville, 75019 Paris',
      },
      {
        annonceId: annonceMed?.id,
        trackingNumber: 'ECO-ART-2025-003',
        contentDescription: 'Tableau encadré 50x70cm',
        length: 55,
        width: 75,
        height: 8,
        weight: 3.0,
        status: 'in_transit' as const,
        locationType: 'in_transit' as const,
        locationId: null,
        currentAddress: 'En transit vers Montparnasse',
      },
    ]

    for (const c of colis) {
      if (!c.annonceId) continue
      await Colis.create(c)
    }

    console.log(`✅ ${colis.length} colis créés correspondant aux annonces`)
  }
}
