import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Prestataire from '#models/prestataire'

export default class UpdatePrestataireRatings extends BaseCommand {
  static commandName = 'update:prestataire-ratings'
  static description = 'Met à jour les notes de tous les prestataires basées sur leurs avis réels'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🔄 Mise à jour des notes des prestataires...')

    try {
      // Récupérer tous les prestataires
      const prestataires = await Prestataire.all()
      this.logger.info(`📋 ${prestataires.length} prestataires trouvés`)

      let updatedCount = 0
      let errorCount = 0

      // Mettre à jour chaque prestataire
      for (const prestataire of prestataires) {
        try {
          const oldRating = prestataire.rating
          await prestataire.updateRating()

          if (oldRating !== prestataire.rating) {
            this.logger.info(
              `✅ Prestataire ${prestataire.id}: ${oldRating || 'null'} → ${prestataire.rating || 'null'}`
            )
            updatedCount++
          }
        } catch (error) {
          this.logger.error(`❌ Erreur prestataire ${prestataire.id}: ${error.message}`)
          errorCount++
        }
      }

      this.logger.success(`🎉 Mise à jour terminée:`)
      this.logger.info(`   - ${updatedCount} prestataires mis à jour`)
      this.logger.info(`   - ${prestataires.length - updatedCount - errorCount} inchangés`)
      if (errorCount > 0) {
        this.logger.warning(`   - ${errorCount} erreurs`)
      }
    } catch (error) {
      this.logger.error(`💥 Erreur générale: ${error.message}`)
      process.exit(1)
    }
  }
}
