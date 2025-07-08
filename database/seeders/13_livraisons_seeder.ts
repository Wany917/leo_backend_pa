import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Livraison from '#models/livraison'
import Utilisateurs from '#models/utilisateurs'
import Annonce from '#models/annonce'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des livraisons existent déjà
    const existingLivraisons = await Livraison.query().limit(1)
    if (existingLivraisons.length > 0) {
      console.log('Des livraisons existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES UTILISATEURS NÉCESSAIRES
    // Livreurs
    const pierreL = await Utilisateurs.findBy('email', 'pierre.durand@livreur-test.fr')
    const julieL = await Utilisateurs.findBy('email', 'julie.moreau@livreurfake.com')
    const alexL = await Utilisateurs.findBy('email', 'alex.bernard@livreur-test.org')

    // Clients
    const emma = await Utilisateurs.findBy('email', 'emma.dubois@email-test.fr')
    const antoine = await Utilisateurs.findBy('email', 'antoine.martin@fakemail.fr')
    const sophie = await Utilisateurs.findBy('email', 'sophie.bernard@testmail.com')

    if (!pierreL || !julieL || !alexL || !emma || !antoine || !sophie) {
      console.log('❌ Utilisateurs manquants pour les livraisons')
      return
    }

    // ✅ RÉCUPÉRER LES ANNONCES EXISTANTES POUR LES LIER
    const annonces = await Annonce.query().where('type', 'transport_colis').limit(4)
    if (annonces.length === 0) {
      console.log('❌ Aucune annonce de transport trouvée')
      return
    }

    // ✅ LIVRAISONS ECODELI - DIFFÉRENTS ÉTATS DU WORKFLOW
    const livraisons = [
      // =================================================================
      // 🚚 LIVRAISON COMPLÉTÉE - Documents urgents
      // =================================================================
      {
        livreurId: pierreL.id,
        clientId: emma.id,
        annonceId: annonces[0]?.id || null,
        pickupLocation: '12 Place de la République, 75003 Paris',
        dropoffLocation: '45 Boulevard Richard-Lenoir, 75011 Paris',
        status: 'completed' as const,
        price: 15.0,
        amount: 15.0,
        paymentStatus: 'paid' as const,
        paymentIntentId: null, // Stripe non géré dans la démo
        deliveredAt: DateTime.now().minus({ hours: 2 }),
        createdAt: DateTime.now().minus({ hours: 4 }),
        updatedAt: DateTime.now().minus({ hours: 2 }),
      },

      // =================================================================
      // 📦 LIVRAISON EN COURS - Commande Fnac
      // =================================================================
      {
        livreurId: julieL.id,
        clientId: antoine.id,
        annonceId: annonces[1]?.id || null,
        pickupLocation: 'Fnac, 4 Place du Châtelet, 75001 Paris',
        dropoffLocation: '23 Rue de Belleville, 75019 Paris',
        status: 'in_progress' as const,
        price: 25.0,
        amount: 25.0,
        paymentStatus: 'pending' as const,
        paymentIntentId: null,
        deliveredAt: null,
        createdAt: DateTime.now().minus({ hours: 1 }),
        updatedAt: DateTime.now().minus({ minutes: 30 }),
      },

      // =================================================================
      // 🎨 LIVRAISON PLANIFIÉE - Œuvre d'art
      // =================================================================
      {
        livreurId: alexL.id,
        clientId: sophie.id,
        annonceId: annonces[2]?.id || null,
        pickupLocation: 'Galerie Perrotin, 76 Rue de Turenne, 75003 Paris',
        dropoffLocation: '18 Avenue du Maine, 75015 Paris',
        status: 'scheduled' as const,
        price: 40.0,
        amount: 40.0,
        paymentStatus: 'unpaid' as const,
        paymentIntentId: null,
        deliveredAt: null,
        createdAt: DateTime.now().minus({ minutes: 45 }),
        updatedAt: DateTime.now().minus({ minutes: 45 }),
      },

      // =================================================================
      // ❌ LIVRAISON ANNULÉE - Client indisponible
      // =================================================================
      {
        livreurId: pierreL.id,
        clientId: emma.id,
        annonceId: null, // Pas d'annonce associée (livraison directe)
        pickupLocation: 'Point Relais Mondial Relay, 15 Rue de Rivoli, 75001 Paris',
        dropoffLocation: '45 Boulevard Richard-Lenoir, 75011 Paris',
        status: 'cancelled' as const,
        price: 20.0,
        amount: 0.0, // Aucun paiement car annulé
        paymentStatus: 'unpaid' as const,
        paymentIntentId: null,
        deliveredAt: null,
        createdAt: DateTime.now().minus({ days: 1 }),
        updatedAt: DateTime.now().minus({ hours: 22 }),
      },

      // =================================================================
      // 💰 LIVRAISON PAYÉE À L'AVANCE - Business
      // =================================================================
      {
        livreurId: julieL.id,
        clientId: antoine.id,
        annonceId: null,
        pickupLocation: 'WeWork Opéra, 33 Rue Lafayette, 75009 Paris',
        dropoffLocation: 'Station F, 5 Parvis Alan Turing, 75013 Paris',
        status: 'completed' as const,
        price: 35.0,
        amount: 35.0,
        paymentStatus: 'paid' as const,
        paymentIntentId: null,
        deliveredAt: DateTime.now().minus({ days: 2, hours: 3 }),
        createdAt: DateTime.now().minus({ days: 2, hours: 5 }),
        updatedAt: DateTime.now().minus({ days: 2, hours: 3 }),
      },

      // =================================================================
      // ⏳ LIVRAISON PAIEMENT EN ATTENTE - Problème carte
      // =================================================================
      {
        livreurId: alexL.id,
        clientId: sophie.id,
        annonceId: null,
        pickupLocation: 'Apple Store Champs-Élysées, 114 Avenue des Champs-Élysées, 75008 Paris',
        dropoffLocation: '18 Avenue du Maine, 75015 Paris',
        status: 'completed' as const, // Livraison faite mais paiement bloqué
        price: 28.0,
        amount: 28.0,
        paymentStatus: 'pending' as const, // Problème de paiement
        paymentIntentId: null,
        deliveredAt: DateTime.now().minus({ hours: 6 }),
        createdAt: DateTime.now().minus({ hours: 8 }),
        updatedAt: DateTime.now().minus({ hours: 6 }),
      },

      // =================================================================
      // 🏥 LIVRAISON EXPRESS - Médicaments urgents
      // =================================================================
      {
        livreurId: pierreL.id,
        clientId: emma.id,
        annonceId: null,
        pickupLocation: 'Pharmacie République, 15 Place de la République, 75003 Paris',
        dropoffLocation: '45 Boulevard Richard-Lenoir, 75011 Paris',
        status: 'completed' as const,
        price: 45.0, // Prix élevé car urgence
        amount: 45.0,
        paymentStatus: 'paid' as const,
        paymentIntentId: null,
        deliveredAt: DateTime.now().minus({ hours: 12 }),
        createdAt: DateTime.now().minus({ hours: 12, minutes: 30 }),
        updatedAt: DateTime.now().minus({ hours: 12 }),
      },

      // =================================================================
      // 📚 LIVRAISON SCOLAIRE - Manuels école
      // =================================================================
      {
        livreurId: julieL.id,
        clientId: antoine.id,
        annonceId: null,
        pickupLocation: 'Gibert Joseph, 26 Boulevard Saint-Michel, 75006 Paris',
        dropoffLocation: 'Lycée Charlemagne, 14 Rue Charlemagne, 75004 Paris',
        status: 'completed' as const,
        price: 18.0,
        amount: 18.0,
        paymentStatus: 'paid' as const,
        paymentIntentId: null,
        deliveredAt: DateTime.now().minus({ days: 3 }),
        createdAt: DateTime.now().minus({ days: 3, hours: 2 }),
        updatedAt: DateTime.now().minus({ days: 3 }),
      },
    ]

    // ✅ CRÉER LES LIVRAISONS AVEC GESTION D'ERREURS
    for (const livraisonData of livraisons) {
      try {
        await Livraison.create(livraisonData)
        console.log(
          `✅ Livraison créée: ${livraisonData.pickupLocation} → ${livraisonData.dropoffLocation} (${livraisonData.status})`
        )
      } catch (error) {
        console.log(`❌ Erreur création livraison:`, error.message)
      }
    }

    console.log(`✅ ${livraisons.length} livraisons EcoDeli créées avec tous les états`)
  }
}
