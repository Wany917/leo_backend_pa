import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Annonce from '#models/annonce'
import Utilisateurs from '#models/utilisateurs'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des annonces existent déjà
    const existingAnnonces = await Annonce.query().limit(1)
    if (existingAnnonces.length > 0) {
      console.log('Des annonces existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES UTILISATEURS PAR EMAIL POUR IDS DYNAMIQUES
    const emma = await Utilisateurs.findBy('email', 'emma.dubois@email-test.fr')
    const antoine = await Utilisateurs.findBy('email', 'antoine.martin@fakemail.fr')
    const sophie = await Utilisateurs.findBy('email', 'sophie.bernard@testmail.com')
    const julien = await Utilisateurs.findBy('email', 'julien.leroy@fakemail.org')
    const marie = await Utilisateurs.findBy('email', 'marie.dufour@email-test.com')
    const lucas = await Utilisateurs.findBy('email', 'lucas.moreau@testmail.org')

    if (!emma || !antoine || !sophie || !julien || !marie || !lucas) {
      console.log('❌ Utilisateurs non trouvés pour les annonces')
      return
    }

    // ✅ ANNONCES ECODELI - BASÉES SUR LE VRAI MÉTIER DE CROWDSHIPPING
    const annonces = [
      // =================================================================
      // 🚚 TRANSPORT DE COLIS - Cas d'usage typiques EcoDeli
      // =================================================================
      {
        utilisateurId: emma.id,
        title: 'Livraison urgente documents légaux République - Bastille',
        description:
          'Besoin de faire livrer des documents notariés urgents de mon notaire République vers mon domicile Bastille. Enveloppe sécurisée, très urgent pour signature avant 17h.',
        price: 15.0,
        type: 'transport_colis' as const,
        status: 'active' as const,
        startLocation: '12 Place de la République, 75003 Paris',
        endLocation: '45 Boulevard Richard-Lenoir, 75011 Paris',
        desiredDate: DateTime.now().plus({ hours: 2 }),
        insuranceAmount: 50.0,
        tags: ['urgent', 'documents', 'securise'],
        priority: true,
        storageBoxId: null,
        actualDeliveryDate: null,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      },
      {
        utilisateurId: antoine.id,
        title: 'Récupération commande Fnac Châtelet → Belleville',
        description:
          "J'ai commandé un ordinateur portable sur fnac.com, disponible en magasin Châtelet. Je travaille et ne peux pas me déplacer. Livraison à domicile Belleville.",
        price: 25.0,
        type: 'transport_colis' as const,
        status: 'active' as const,
        startLocation: 'Fnac, 4 Place du Châtelet, 75001 Paris',
        endLocation: '23 Rue de Belleville, 75019 Paris',
        desiredDate: DateTime.now().plus({ days: 1 }),
        insuranceAmount: 800.0,
        tags: ['electronique', 'fragile', 'fnac'],
        priority: false,
        storageBoxId: null,
        actualDeliveryDate: null,
        createdAt: DateTime.now().minus({ hours: 3 }),
        updatedAt: DateTime.now().minus({ hours: 3 }),
      },
      {
        utilisateurId: sophie.id,
        title: "Transport oeuvre d'art Marais → Montparnasse",
        description:
          'Tableau encadré (50x70cm) à récupérer chez un galeriste du Marais et livrer chez moi Montparnasse. Très fragile, emballage fourni, manipulation délicate requise.',
        price: 40.0,
        type: 'transport_colis' as const,
        status: 'pending' as const,
        startLocation: 'Galerie Perrotin, 76 Rue de Turenne, 75003 Paris',
        endLocation: '18 Avenue du Maine, 75015 Paris',
        desiredDate: DateTime.now().plus({ days: 2 }),
        insuranceAmount: 1200.0,
        tags: ['art', 'fragile', 'encombre'],
        priority: true,
        storageBoxId: null,
        actualDeliveryDate: null,
        createdAt: DateTime.now().minus({ hours: 8 }),
        updatedAt: DateTime.now().minus({ hours: 2 }),
      },

      // =================================================================
      // 👥 SERVICES À LA PERSONNE - Selon cahier des charges EcoDeli
      // =================================================================
      {
        utilisateurId: julien.id,
        title: 'Accompagnement médical urgente Hôpital Saint-Louis',
        description:
          "Ma grand-mère de 85 ans a rendez-vous urgente chez le cardiologue à Saint-Louis. Je ne peux pas l'accompagner. Besoin d'une personne bienveillante pour l'accompagner.",
        price: 60.0,
        type: 'service_personne' as const,
        status: 'active' as const,
        startLocation: '34 Rue du Faubourg Saint-Martin, 75010 Paris',
        endLocation: 'Hôpital Saint-Louis, 1 Avenue Claude Vellefaux, 75010 Paris',
        desiredDate: DateTime.now().plus({ days: 1, hours: 9 }),
        insuranceAmount: 0.0,
        tags: ['medical', 'accompagnement', 'senior', 'urgent'],
        priority: true,
        storageBoxId: null,
        actualDeliveryDate: null,
        createdAt: DateTime.now().minus({ hours: 1 }),
        updatedAt: DateTime.now().minus({ hours: 1 }),
      },
      {
        utilisateurId: marie.id,
        title: 'Service ménage ponctuel appartement 3 pièces République',
        description:
          "Ménage complet appartement 65m² (salon, cuisine, 2 chambres, sdb). Aspirateur, serpillère, produits fournis. Disponible aujourd'hui ou demain.",
        price: 45.0,
        type: 'service_personne' as const,
        status: 'active' as const,
        startLocation: '8 Rue du Temple, 75004 Paris',
        endLocation: '8 Rue du Temple, 75004 Paris',
        desiredDate: DateTime.now().plus({ hours: 6 }),
        insuranceAmount: 0.0,
        tags: ['menage', 'ponctuel', 'produits-fournis'],
        priority: false,
        storageBoxId: null,
        actualDeliveryDate: null,
        createdAt: DateTime.now().minus({ hours: 5 }),
        updatedAt: DateTime.now().minus({ hours: 5 }),
      },
      {
        utilisateurId: lucas.id,
        title: "Garde d'enfants exceptionnelle soirée Bastille",
        description:
          'Garde de mes 2 enfants (6 et 9 ans) pour soirée exceptionnelle. De 19h à minuit. Enfants calmes, dîner préparé, juste supervision et mise au lit.',
        price: 80.0,
        type: 'service_personne' as const,
        status: 'completed' as const,
        startLocation: '12 Rue de la Roquette, 75011 Paris',
        endLocation: '12 Rue de la Roquette, 75011 Paris',
        desiredDate: DateTime.now().minus({ days: 3 }),
        insuranceAmount: 0.0,
        tags: ['garde-enfants', 'soiree', 'ponctuel'],
        priority: false,
        storageBoxId: null,
        actualDeliveryDate: DateTime.now().minus({ days: 3, hours: 5 }),
        createdAt: DateTime.now().minus({ days: 4 }),
        updatedAt: DateTime.now().minus({ days: 3 }),
      },

      // =================================================================
      // 📦 CAS AVEC STOCKAGE TEMPORAIRE - Spécificité EcoDeli
      // =================================================================
      {
        utilisateurId: emma.id,
        title: 'Récupération colis Amazon + stockage temporaire',
        description:
          "Mon colis Amazon arrive demain mais je pars en weekend. Besoin de quelqu'un pour récupérer et stocker 2-3 jours avant livraison chez moi.",
        price: 20.0,
        type: 'transport_colis' as const,
        status: 'active' as const,
        startLocation: 'Point Relais Mondial Relay, 15 Rue de Rivoli, 75001 Paris',
        endLocation: '45 Boulevard Richard-Lenoir, 75011 Paris',
        desiredDate: DateTime.now().plus({ days: 5 }),
        insuranceAmount: 100.0,
        tags: ['amazon', 'stockage-temporaire', 'weekend'],
        priority: false,
        storageBoxId: 'BOX_REPUBLIQUE_A12',
        actualDeliveryDate: null,
        createdAt: DateTime.now().minus({ hours: 12 }),
        updatedAt: DateTime.now().minus({ hours: 12 }),
      },
    ]

    for (const annonceData of annonces) {
      try {
        await Annonce.create(annonceData)
        console.log(`✅ Annonce créée: ${annonceData.title}`)
      } catch (error) {
        console.log(`❌ Erreur création annonce ${annonceData.title}:`, error.message)
      }
    }

    console.log(`✅ ${annonces.length} annonces EcoDeli créées avec succès`)
  }
}
