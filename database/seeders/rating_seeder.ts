import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Rating from '#models/rating'
import Client from '#models/client'
import Prestataire from '#models/prestataire'

export default class extends BaseSeeder {
  async run() {
    console.log('🌟 Génération des avis clients...')

    // Récupérer tous les clients et prestataires
    const clients = await Client.all()
    const prestataires = await Prestataire.all()

    if (clients.length === 0 || prestataires.length === 0) {
      console.log("❌ Aucun client ou prestataire trouvé. Exécutez d'abord les autres seeders.")
      return
    }

    console.log(
      `📊 Clients trouvés: ${clients.length}, Prestataires trouvés: ${prestataires.length}`
    )

    const reviewComments = {
      excellent: [
        'Service exceptionnel ! Je recommande vivement ce prestataire.',
        'Travail parfait, très professionnel et ponctuel.',
        'Dépassé mes attentes, service de qualité supérieure.',
        'Prestataire très compétent et sympathique.',
        "Rien à redire, c'était parfait du début à la fin.",
        'Service irréprochable, je ferai de nouveau appel à lui.',
      ],
      good: [
        "Bon service dans l'ensemble, quelques petits points à améliorer.",
        'Prestataire sérieux et travail de qualité.',
        'Service correct, conforme à mes attentes.',
        'Bonne prestation, je recommande.',
        'Travail bien fait, communication claire.',
      ],
      average: [
        'Service moyen, peut mieux faire sur la ponctualité.',
        'Prestation correcte mais sans plus.',
        'Service acceptable, quelques améliorations possibles.',
        "Travail fait mais j'ai eu quelques soucis de communication.",
      ],
      poor: [
        'Service décevant, pas à la hauteur de mes attentes.',
        'Problèmes de ponctualité et de communication.',
        'Travail bâclé, je ne recommande pas.',
      ],
    }

    let createdReviews = 0

    // Générer des avis pour chaque prestataire (2-5 avis par prestataire)
    for (const prestataire of prestataires) {
      const numberOfReviews = Math.floor(Math.random() * 4) + 2 // Entre 2 et 5 avis

      for (let i = 0; i < numberOfReviews; i++) {
        // Sélectionner un client aléatoire différent du prestataire
        const availableClients = clients.filter((client) => client.id !== prestataire.id)
        if (availableClients.length === 0) continue

        const randomClient = availableClients[Math.floor(Math.random() * availableClients.length)]
        const rating = this.generateWeightedRating()
        let comment = ''

        if (rating >= 4.5) {
          comment =
            reviewComments.excellent[Math.floor(Math.random() * reviewComments.excellent.length)]
        } else if (rating >= 3.5) {
          comment = reviewComments.good[Math.floor(Math.random() * reviewComments.good.length)]
        } else if (rating >= 2.5) {
          comment =
            reviewComments.average[Math.floor(Math.random() * reviewComments.average.length)]
        } else {
          comment = reviewComments.poor[Math.floor(Math.random() * reviewComments.poor.length)]
        }

        await Rating.create({
          reviewer_id: randomClient.id,
          reviewed_id: prestataire.id,
          rating_type: 'service',
          rating_for_id: 1000 + createdReviews, // ID fictif unique
          overall_rating: Math.round(rating * 10) / 10, // Arrondir à 1 décimale
          punctuality_rating: this.generateRelatedRating(rating),
          quality_rating: this.generateRelatedRating(rating),
          communication_rating: this.generateRelatedRating(rating),
          value_rating: this.generateRelatedRating(rating),
          comment: comment,
          is_verified_purchase: Math.random() < 0.8, // 80% des avis sont vérifiés
          is_visible: true,
        })

        createdReviews++
      }
    }

    console.log(`✅ ${createdReviews} avis générés avec succès`)
  }

  /**
   * Génère une note pondérée (plus de bonnes notes que de mauvaises)
   */
  private generateWeightedRating(): number {
    const weights = [
      { rating: 5, weight: 40 }, // 40% de 5 étoiles
      { rating: 4, weight: 30 }, // 30% de 4 étoiles
      { rating: 3, weight: 20 }, // 20% de 3 étoiles
      { rating: 2, weight: 7 }, // 7% de 2 étoiles
      { rating: 1, weight: 3 }, // 3% de 1 étoile
    ]

    const random = Math.random() * 100
    let cumulative = 0

    for (const { rating, weight } of weights) {
      cumulative += weight
      if (random <= cumulative) {
        // Ajouter une variation pour des notes comme 4.2, 4.7, etc.
        const variation = (Math.random() - 0.5) * 0.8 // ±0.4
        return Math.max(1, Math.min(5, rating + variation))
      }
    }

    return 4 // Fallback
  }

  /**
   * Génère des notes connexes (ponctualité, qualité, etc.) basées sur la note globale
   */
  private generateRelatedRating(overallRating: number): number {
    // Les notes connexes sont généralement proches de la note globale
    const variation = (Math.random() - 0.5) * 1.0 // ±0.5
    return Math.max(1, Math.min(5, Math.round(overallRating + variation)))
  }
}
