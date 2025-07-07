import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ratings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('reviewer_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table
        .integer('reviewed_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table.enum('rating_type', ['delivery', 'service', 'product']).notNullable()
      table.integer('rating_for_id').unsigned().notNullable() // ID de la livraison, service ou produit
      table.decimal('overall_rating', 3, 1).notNullable() // 1-5 avec 1 décimale (ex: 4.2)
      table.decimal('punctuality_rating', 3, 1).nullable() // Pour livraisons/services
      table.decimal('quality_rating', 3, 1).nullable() // Pour services/produits
      table.decimal('communication_rating', 3, 1).nullable() // Pour tous
      table.decimal('value_rating', 3, 1).nullable() // Rapport qualité/prix
      table.text('comment').nullable()
      table.boolean('is_verified_purchase').defaultTo(true)
      table.boolean('is_visible').defaultTo(true)
      table.text('admin_response').nullable()
      table.timestamp('admin_response_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['reviewed_id', 'rating_type'])
      table.index(['rating_for_id', 'rating_type'])
      table.unique(['reviewer_id', 'rating_type', 'rating_for_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
