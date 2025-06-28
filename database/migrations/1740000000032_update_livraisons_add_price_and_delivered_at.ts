import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livraisons'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('price', 10, 2).nullable().comment('Prix convenu pour la livraison')
      table.timestamp('delivered_at').nullable().comment('Date et heure de livraison effective')
      table
        .integer('annonce_id')
        .unsigned()
        .nullable()
        .comment("Annonce à l'origine de la livraison")

      // Index pour performance
      table.index(['delivered_at'])
      table.index(['annonce_id'])

      // Foreign keys
      table.foreign('annonce_id').references('id').inTable('annonces').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('price')
      table.dropColumn('delivered_at')
      table.dropColumn('annonce_id')
    })
  }
}
