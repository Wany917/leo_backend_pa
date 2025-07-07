import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  // Migration pour corriger les séquences PostgreSQL
  protected tableName = 'fix_postgresql_sequences'

  async up() {
    // 🔧 Correction des séquences PostgreSQL pour éviter les conflits de clés primaires
    console.log('🔧 Correction des séquences PostgreSQL...')

    // Tables critiques pour la création d'utilisateurs
    const criticalTables = [
      'utilisateurs',
      'subscriptions', // ❌ Problème principal actuel
      'admins',
      'clients',
      'livreurs',
      'prestataires',
      'commercants',
    ]

    for (const tableName of criticalTables) {
      // Utiliser defer pour exécuter du SQL brut
      this.defer(async (db) => {
        try {
          // Vérifier si la table existe
          const tableExists = await db.rawQuery(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${tableName}'
            )
          `)

          if (!tableExists.rows[0].exists) {
            console.log(`⚠️  Table "${tableName}" n'existe pas - ignorée`)
            return
          }

          // Vérifier si la séquence existe
          const seqExists = await db.rawQuery(`
            SELECT EXISTS (
              SELECT FROM information_schema.sequences 
              WHERE sequence_name = '${tableName}_id_seq'
            )
          `)

          if (!seqExists.rows[0].exists) {
            console.log(`⚠️  Séquence "${tableName}_id_seq" n'existe pas - ignorée`)
            return
          }

          // Corriger la séquence
          const maxIdResult = await db.rawQuery(`SELECT MAX(id) as max_id FROM ${tableName}`)
          const maxId = maxIdResult.rows[0]?.max_id

          if (maxId && maxId > 0) {
            await db.rawQuery(`SELECT setval('${tableName}_id_seq', ${maxId})`)
            console.log(`✅ ${tableName}: séquence corrigée vers ${maxId}`)
          } else {
            await db.rawQuery(`SELECT setval('${tableName}_id_seq', 1)`)
            console.log(`✅ ${tableName}: séquence initialisée à 1`)
          }
        } catch (error) {
          console.log(`⚠️  Erreur avec ${tableName}: ${error.message}`)
        }
      })
    }

    console.log('✅ Migration de correction des séquences terminée')
  }

  async down() {
    // On ne peut pas "défaire" une correction de séquence
    // Cette migration est idempotente et sûre
    console.log('ℹ️  Pas de rollback nécessaire pour la correction des séquences')
  }
}
