import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'translations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('locale', 5).notNullable() // fr, en, es, ar, etc.
      table.string('namespace').notNullable() // ui, email, notification, etc.
      table.string('key').notNullable() // Clé de traduction
      table.text('value').notNullable() // Texte traduit
      table.json('metadata').nullable() // Infos supplémentaires (contexte, etc.)
      table.boolean('is_verified').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['locale', 'namespace', 'key'])
      table.index(['locale', 'namespace'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
