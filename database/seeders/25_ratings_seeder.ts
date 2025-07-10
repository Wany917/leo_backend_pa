import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Rating from '#models/rating'
import Utilisateurs from '#models/utilisateurs'
import Service from '#models/service'
import Livraison from '#models/livraison'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  public async run() {
    const existingRatings = await Rating.query().limit(1)
    if (existingRatings.length > 0) {
      console.log('Des ratings existent déjà, seeder ignoré')
      return
    }

    // --- Utilisateurs ---
    const emma = await Utilisateurs.findBy('email', 'emma.dubois@email-test.fr')
    const antoine = await Utilisateurs.findBy('email', 'antoine.martin@fakemail.fr')
    const sophie = await Utilisateurs.findBy('email', 'sophie.bernard@testmail.com')

    // --- Prestataires ---
    const isabelle = await Utilisateurs.findBy('email', 'isabelle.cohen@prestafake.fr')
    const thomas = await Utilisateurs.findBy('email', 'thomas.roux@servicefake.com')

    // --- Services ---
    const menageService = await Service.findBy('name', 'Ménage complet domicile')
    const gardeEnfantsService = await Service.findBy('name', "Garde d'enfants ponctuelle")

    // --- Livreurs ---
    const pierreL = await Utilisateurs.findBy('email', 'pierre.durand@livreur-test.fr')
    const livraisonComplete = await Livraison.query()
      .where('livreurId', pierreL!.id)
      .where('status', 'completed')
      .first()

    if (
      !emma ||
      !antoine ||
      !sophie ||
      !isabelle ||
      !thomas ||
      !menageService ||
      !gardeEnfantsService ||
      !pierreL ||
      !livraisonComplete
    ) {
      console.log('❌ Entités manquantes pour créer les ratings, seeder ignoré')
      return
    }

    const ratings = [
      // Évaluation d'un service par Emma
      {
        reviewerId: emma.id,
        reviewedId: isabelle.id, // ID du prestataire
        ratingType: 'service' as const,
        ratingForId: menageService.id, // ID du service
        overallRating: 5,
        punctualityRating: 5,
        qualityRating: 5,
        communicationRating: 4,
        valueRating: 4,
        comment: 'Excellent service, Isabelle était très professionnelle. Je recommande vivement !',
        isVerifiedPurchase: true,
        isVisible: true,
        createdAt: DateTime.now().minus({ days: 10 }),
        updatedAt: DateTime.now().minus({ days: 10 }),
      },
      // Évaluation d'un service par Antoine
      {
        reviewerId: antoine.id,
        reviewedId: thomas.id,
        ratingType: 'service' as const,
        ratingForId: gardeEnfantsService.id,
        overallRating: 4,
        punctualityRating: 5,
        qualityRating: 4,
        communicationRating: 4,
        valueRating: 3,
        comment:
          'Thomas a été super avec les enfants, très ponctuel. Un peu cher mais la qualité est là.',
        isVerifiedPurchase: true,
        isVisible: true,
        createdAt: DateTime.now().minus({ days: 5 }),
        updatedAt: DateTime.now().minus({ days: 5 }),
      },
      // Évaluation d'une livraison par Sophie
      {
        reviewerId: sophie.id,
        reviewedId: pierreL.id, // ID du livreur
        ratingType: 'delivery' as const,
        ratingForId: livraisonComplete.id, // ID de la livraison
        overallRating: 3,
        punctualityRating: 3,
        qualityRating: 4,
        communicationRating: 3,
        valueRating: 4,
        comment:
          'La livraison a eu un peu de retard, mais le livreur était courtois et le colis en parfait état.',
        isVerifiedPurchase: true,
        isVisible: true,
        createdAt: DateTime.now().minus({ days: 3 }),
        updatedAt: DateTime.now().minus({ days: 3 }),
      },
      // Mauvaise évaluation pour tester
      {
        reviewerId: antoine.id,
        reviewedId: isabelle.id,
        ratingType: 'service' as const,
        ratingForId: menageService.id,
        overallRating: 1,
        punctualityRating: 2,
        qualityRating: 1,
        communicationRating: 1,
        valueRating: 1,
        comment:
          'Pas satisfait du tout. Le ménage était superficiel et la prestataire peu aimable.',
        isVerifiedPurchase: true,
        isVisible: true,
        adminResponse:
          "Nous sommes désolés d'apprendre votre mauvaise expérience. Nous allons vous contacter pour trouver une solution.",
        adminResponseAt: DateTime.now(),
        createdAt: DateTime.now().minus({ days: 2 }),
        updatedAt: DateTime.now(),
      },
    ]

    await Rating.createMany(ratings)
    console.log(`✅ ${ratings.length} ratings créés avec succès.`)
  }
}
