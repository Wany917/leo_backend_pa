import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'justification_pieces'

  async up() {
    // Vérifier si les colonnes existent déjà avant de les ajouter
    this.defer(async (db) => {
      const result = await db.rawQuery(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'justification_pieces' 
        AND column_name IN ('created_at', 'updated_at')
      `)

      const existingColumns = result.rows.map((row: any) => row.column_name)

      if (!existingColumns.includes('created_at') || !existingColumns.includes('updated_at')) {
        console.log(
          'ℹ️  Les colonnes timestamps existent déjà dans justification_pieces - migration ignorée'
        )
      } else {
        console.log('ℹ️  Colonnes timestamps déjà présentes dans justification_pieces')
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('created_at')
      table.dropColumn('updated_at')
    })
  }
}
