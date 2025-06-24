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
      table.integer('overall_rating').unsigned().notNullable() // 1-5
      table.integer('punctuality_rating').unsigned().nullable() // Pour livraisons/services
      table.integer('quality_rating').unsigned().nullable() // Pour services/produits
      table.integer('communication_rating').unsigned().nullable() // Pour tous
      table.integer('value_rating').unsigned().nullable() // Rapport qualité/prix
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
