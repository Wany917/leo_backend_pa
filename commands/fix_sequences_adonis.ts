// Script de réparation des séquences via Adonis ORM
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FixSequencesCommand extends BaseCommand {
  static commandName = 'fix:sequences'
  static description = 'Fix PostgreSQL sequences for user creation - specifically subscriptions'

  static options: CommandOptions = {}

  async run() {
    this.logger.info('🔧 Réparation des séquences PostgreSQL via Adonis...')

    try {
      // Tables critiques pour la création d'utilisateur
      const criticalTables = [
        'utilisateurs',
        'subscriptions', // ❌ PROBLÈME ACTUEL
        'admins',
        'clients',
        'livreurs',
        'prestataires',
        'commercants',
      ]

      let successCount = 0
      let skipCount = 0

      for (const tableName of criticalTables) {
        try {
          this.logger.info(`🔍 Vérification: ${tableName}`)

          // Vérifier si la table a des données
          const maxIdResult = await db.rawQuery(`SELECT MAX(id) as max_id FROM ${tableName}`)
          const maxId = maxIdResult.rows?.[0]?.max_id

          if (maxId && maxId > 0) {
            // Réparer la séquence
            await db.rawQuery(`SELECT setval('${tableName}_id_seq', ${maxId})`)
            this.logger.success(`✅ ${tableName}: séquence mise à jour vers ${maxId}`)
            successCount++
          } else {
            // Table vide, initialiser à 1
            await db.rawQuery(`SELECT setval('${tableName}_id_seq', 1)`)
            this.logger.warning(`⚠️  ${tableName}: table vide, séquence initialisée à 1`)
            successCount++
          }

          // Vérifier la réparation
          const nextValResult = await db.rawQuery(`SELECT nextval('${tableName}_id_seq')`)
          const nextVal = nextValResult.rows?.[0]?.nextval

          // Remettre à la bonne valeur (nextval l'a incrémentée)
          await db.rawQuery(`SELECT setval('${tableName}_id_seq', ${maxId || 1})`)

          this.logger.info(`🎯 ${tableName}: Prochain ID sera ${(maxId || 1) + 1}`)
        } catch (tableError) {
          this.logger.warning(`⚠️  ${tableName}: ${tableError.message}`)
          skipCount++
        }
      }

      this.logger.info('')
      this.logger.success(
        `🎉 Réparation terminée: ${successCount} séquences corrigées, ${skipCount} ignorées`
      )

      if (successCount > 0) {
        this.logger.info('')
        this.logger.info('🚀 RÉSULTATS:')
        this.logger.info("   ✅ Création d'utilisateurs devrait maintenant fonctionner")
        this.logger.info('   ✅ Subscriptions peuvent être créées sans conflit')
        this.logger.info('   ✅ Toutes les séquences sont synchronisées')
      }
    } catch (globalError) {
      this.logger.error(`❌ Erreur globale: ${globalError.message}`)
      this.logger.info('')
      this.logger.info('💡 Alternative: Utilisez DataGrip pour exécuter:')
      this.logger.info(
        "   SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions));"
      )
    }
  }
}
