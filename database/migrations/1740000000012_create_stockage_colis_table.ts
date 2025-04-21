import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'stockage_colis'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('colis_tracking_number').notNullable()
      table.integer('wharehouse_id').unsigned().notNullable()
      table.string('storage_area').notNullable()
      table.dateTime('stored_until').notNullable()
      table.string('description').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table
        .foreign('colis_tracking_number')
        .references('tracking_number')
        .inTable('colis')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}