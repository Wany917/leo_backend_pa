import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'colis'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('tracking_number').notNullable().primary()
      table.integer('annonce_id').unsigned().notNullable()
      table.integer('livreur_id').unsigned().nullable()
      table.decimal('weight', 10, 2).notNullable()
      table.decimal('length', 10, 2).notNullable()
      table.decimal('width', 10, 2).notNullable()
      table.decimal('height', 10, 2).notNullable()
      table.string('content_description').notNullable()
      table.enum('status', ['stored', 'in_transit', 'delivered', 'lost']).defaultTo('stored')

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table
        .foreign('annonce_id')
        .references('id')
        .inTable('annonces')
        .onDelete('CASCADE')

      table
        .foreign('livreur_id')
        .references('id')
        .inTable('livreurs')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
