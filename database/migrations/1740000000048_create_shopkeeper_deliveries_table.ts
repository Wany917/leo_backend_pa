import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'shopkeeper_deliveries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('commercant_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')

      table
        .integer('livreur_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('SET NULL')
        .nullable()

      table.string('customer_name').notNullable()
      table.string('customer_email').notNullable()
      table.text('customer_address').notNullable()
      table.text('products_summary').notNullable()
      table.decimal('total_weight', 8, 2).nullable()

      table
        .enum('status', ['pending_acceptance', 'accepted', 'in_transit', 'delivered', 'cancelled'])
        .defaultTo('pending_acceptance')
        .notNullable()

      table.string('tracking_number').unique().notNullable()
      table.decimal('price', 10, 2).notNullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
