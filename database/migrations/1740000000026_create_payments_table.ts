import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table.enum('payment_type', ['subscription', 'service', 'delivery', 'commission'])
      table.decimal('amount', 10, 2).notNullable()
      table.string('currency', 3).defaultTo('EUR')
      table
        .enum('status', ['pending', 'processing', 'completed', 'failed', 'refunded'])
        .defaultTo('pending')
      table.string('stripe_payment_id').nullable()
      table.string('stripe_customer_id').nullable()
      table.string('stripe_payment_method').nullable()
      table.json('metadata').nullable() // Stocker des infos supplémentaires (ID service, livraison, etc.)
      table.text('failure_reason').nullable()
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['user_id', 'status'])
      table.index('stripe_payment_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
