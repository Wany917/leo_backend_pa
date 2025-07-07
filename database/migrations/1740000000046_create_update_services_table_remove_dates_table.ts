import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'services'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Supprimer les colonnes de dates qui n'ont pas de sens pour des services continus
      table.dropColumn('start_date')
      table.dropColumn('end_date')

      // Ajouter de nouveaux champs pertinents si ils n'existent pas déjà
      // (on utilise hasColumn pour éviter les erreurs de colonnes existantes)
    })

    // Ajouter les nouvelles colonnes si elles n'existent pas
    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      ADD COLUMN IF NOT EXISTS pricing_type TEXT CHECK (pricing_type IN ('fixed', 'hourly', 'custom')) DEFAULT 'fixed',
      ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) NULL,
      ADD COLUMN IF NOT EXISTS availability_description TEXT NULL,
      ADD COLUMN IF NOT EXISTS home_service BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS requires_materials BOOLEAN DEFAULT false
    `)
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remettre les dates (uniquement pour le rollback)
      table.dateTime('start_date').nullable()
      table.dateTime('end_date').nullable()

      // Supprimer les nouvelles colonnes
      table.dropColumn('pricing_type')
      table.dropColumn('hourly_rate')
      table.dropColumn('availability_description')
      table.dropColumn('home_service')
      table.dropColumn('requires_materials')
    })
  }
}
