import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Database from '@adonisjs/lucid/services/db'
import Rating from '#models/rating'
import Prestataire from '#models/prestataire'

export default class CheckRatingsSync extends BaseCommand {
  static commandName = 'check:ratings-sync'
  static description =
    'Diagnostique et corrige la synchronisation entre les avis et les notes des prestataires'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🔍 Diagnostic de la synchronisation des avis...')

    try {
      // Vérifier les avis dans la base
      const ratings = await Rating.query().where('rating_type', 'service').where('is_visible', true)

      this.logger.info(`📊 Total des avis visibles: ${ratings.length}`)

      if (ratings.length > 0) {
        this.logger.info('🔍 Détails des avis:')
        ratings.forEach((rating) => {
          this.logger.info(
            `   - Avis ${rating.id}: prestataire ${rating.reviewed_id}, note ${rating.overall_rating}`
          )
        })

        // Regrouper par prestataire
        const ratingsByPrestataire = ratings.reduce(
          (acc, rating) => {
            if (!acc[rating.reviewed_id]) {
              acc[rating.reviewed_id] = []
            }
            acc[rating.reviewed_id].push(rating)
            return acc
          },
          {} as Record<number, any[]>
        )

        this.logger.info('📈 Notes par prestataire:')
        for (const [prestataireIdStr, prestataireRatings] of Object.entries(ratingsByPrestataire)) {
          const prestataireId = parseInt(prestataireIdStr)

          // Conversion sécurisée des notes
          const validRatings = prestataireRatings
            .map((r) => {
              const numRating =
                typeof r.overall_rating === 'string'
                  ? parseFloat(r.overall_rating)
                  : r.overall_rating
              return !isNaN(numRating) ? numRating : null
            })
            .filter((r) => r !== null) as number[]

          const avgRating =
            validRatings.length > 0
              ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
              : 0
          const roundedAvg = Math.round(avgRating * 10) / 10

          this.logger.info(
            `   - Prestataire ${prestataireId}: ${prestataireRatings.length} avis, moyenne calculée ${roundedAvg}`
          )

          // Vérifier la note actuelle
          const prestataire = await Prestataire.find(prestataireId)
          if (prestataire) {
            this.logger.info(`     Note actuelle: ${prestataire.rating || 'null'}`)

            if (prestataire.rating !== roundedAvg) {
              // Mettre à jour via le modèle pour assurer la cohérence
              await prestataire.updateRating()
              await prestataire.refresh()
              this.logger.success(`     ✅ Note mise à jour: ${prestataire.rating}`)
            } else {
              this.logger.info(`     ✅ Note déjà synchronisée`)
            }
          }
        }
      } else {
        this.logger.warning('⚠️  Aucun avis trouvé')
      }

      // Vérifier toutes les notes actuelles des prestataires
      const prestataires = await Prestataire.all()
      this.logger.info('🏪 État final des notes des prestataires:')
      prestataires.forEach((p) => {
        this.logger.info(`   - Prestataire ${p.id}: ${p.rating || 'null'}`)
      })
    } catch (error) {
      this.logger.error(`💥 Erreur: ${error.message}`)
      process.exit(1)
    }
  }
}
