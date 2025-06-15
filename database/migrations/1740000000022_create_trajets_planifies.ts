import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trajets_planifies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('livreur_id')
        .unsigned()
        .references('id')
        .inTable('livreurs')
        .onDelete('CASCADE')
      table.string('starting_address').notNullable()
      table.string('destination_address').notNullable()
      table.timestamp('planned_date').notNullable()
      table.text('description').nullable()
      table.enum('type', ['delivery_route', 'shopping_trip', 'other']).defaultTo('delivery_route')
      table.enum('status', ['active', 'completed', 'cancelled']).defaultTo('active')
      table.integer('max_capacity').nullable() // Nombre maximum de colis/courses qu'il peut prendre
      table.integer('estimated_duration').nullable() // Durée estimée en minutes

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
