import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livreur_routes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('livreur_id')
        .unsigned()
        .references('id')
        .inTable('livreurs')
        .onDelete('CASCADE')
      table
        .integer('trajet_planifie_id')
        .unsigned()
        .references('id')
        .inTable('trajets_planifies')
        .onDelete('CASCADE')
      table.string('current_location').nullable()
      table.enum('status', ['en_cours', 'termine', 'annule']).defaultTo('en_cours')
      table.timestamp('started_at').nullable()
      table.timestamp('completed_at').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
