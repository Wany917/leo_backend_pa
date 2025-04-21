import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livraisons'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('colis_tracking_number').notNullable()
      table.integer('livraison_id').unsigned().notNullable()
      table.dateTime('scheduled_date').notNullable()
      table.dateTime('delivery_date').nullable()
      table.string('pickup_location').notNullable()
      table.string('dropoff_location').notNullable()
      table.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).defaultTo('scheduled')

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table
        .foreign('colis_tracking_number')
        .references('tracking_number')
        .inTable('colis')
        .onDelete('CASCADE')

      table
        .foreign('livraison_id')
        .references('id')
        .inTable('livraisons')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}