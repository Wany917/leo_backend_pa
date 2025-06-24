import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('invoice_number').unique().notNullable() // Format: INV-2025-00001
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table
        .integer('payment_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('payments')
        .onDelete('SET NULL')
      table.enum('invoice_type', ['subscription', 'service', 'delivery', 'commission'])
      table.decimal('subtotal', 10, 2).notNullable()
      table.decimal('tax_rate', 5, 2).defaultTo(20.0) // TVA 20%
      table.decimal('tax_amount', 10, 2).notNullable()
      table.decimal('total_amount', 10, 2).notNullable()
      table.string('currency', 3).defaultTo('EUR')
      table.enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']).defaultTo('draft')
      table.json('line_items').notNullable() // Détail des articles facturés
      table.json('billing_address').notNullable()
      table.string('pdf_url').nullable()
      table.timestamp('due_date').nullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['user_id', 'status'])
      table.index('invoice_number')
      table.index('due_date')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
