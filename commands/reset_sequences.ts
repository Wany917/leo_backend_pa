import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import app from '@adonisjs/core/services/app'

export default class ResetSequences extends BaseCommand {
  static commandName = 'reset:sequences'
  static description = 'Reset PostgreSQL sequences to fix auto-increment after seeders'

  static options: CommandOptions = {}

  async run() {
    this.logger.info('🔄 Reset des séquences PostgreSQL...')

    try {
      // Récupérer le service de base de données via l'app
      const { default: db } = await import('@adonisjs/lucid/services/db')

      // ✅ LISTE COMPLÈTE DES TABLES AVEC AUTO-INCREMENT
      const tables = [
        'utilisateurs',
        'admins',
        'clients',
        'livreurs',
        'commercants',
        'prestataires',
        'annonces',
        'colis',
        'livraisons',
        'wharehouses',
        'stockage_colis',
        'historique_livraisons',
        'messages',
        'complaints',
        'subscriptions',
        'services',
        'service_types',
        'justification_pieces',
        'bookings',
        'livreur_positions',
        'colis_location_histories',
        'portefeuille_ecodeli',
        'transactions_portefeuille',
        'payments',
        'invoices',
        'push_notifications',
        'ratings',
        'insurances',
        'translations',
      ]

      let successCount = 0
      let skipCount = 0

      for (const table of tables) {
        try {
          // Vérifier d'abord si la table a des enregistrements
          const result = await db.rawQuery(`SELECT MAX(id) as max_id FROM ${table}`)
          const maxId = result.rows?.[0]?.max_id

          if (maxId && maxId > 0) {
            // Reset la séquence avec la valeur correcte
            await db.rawQuery(`SELECT setval('${table}_id_seq', ${maxId})`)
            this.logger.success(`✅ Séquence ${table} mise à jour (max_id: ${maxId})`)
            successCount++
          } else {
            this.logger.warning(`⚠️  Table ${table} vide, séquence non modifiée`)
            skipCount++
          }
        } catch (error) {
          // Ignorer les erreurs de tables qui n'existent pas ou n'ont pas de séquence
          this.logger.warning(`⚠️  Table ${table} ignorée: ${error.message}`)
          skipCount++
        }
      }

      this.logger.info(
        `🎉 Reset terminé ! ${successCount} séquences mises à jour, ${skipCount} ignorées`
      )
      this.logger.info("🚀 Vous pouvez maintenant créer de nouveaux comptes sans conflit d'ID !")
      this.logger.info('💡 Conseil : Exécutez cette commande après chaque run des seeders')
    } catch (globalError) {
      this.logger.error(`❌ Erreur globale: ${globalError.message}`)
      this.logger.info('💡 Alternative: Connectez-vous manuellement à PostgreSQL et exécutez:')
      this.logger.info(
        "   SELECT setval('utilisateurs_id_seq', (SELECT MAX(id) FROM utilisateurs));"
      )
    }
  }
}
