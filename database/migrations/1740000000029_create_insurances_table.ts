import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'insurances'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('colis_id').unsigned().references('id').inTable('colis').onDelete('CASCADE')
      table
        .integer('annonce_id')
        .unsigned()
        .references('id')
        .inTable('annonces')
        .onDelete('CASCADE')
      table.string('policy_number').unique().notNullable()
      table.decimal('coverage_amount', 10, 2).notNullable()
      table.decimal('premium_amount', 10, 2).notNullable()
      table.enum('status', ['active', 'claimed', 'expired', 'cancelled']).defaultTo('active')
      table.text('covered_items').nullable()
      table.dateTime('start_date').notNullable()
      table.dateTime('end_date').notNullable()
      table.text('claim_description').nullable()
      table.decimal('claim_amount', 10, 2).nullable()
      table.dateTime('claim_date').nullable()
      table.enum('claim_status', ['pending', 'approved', 'rejected', 'paid']).nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['colis_id', 'status'])
      table.index('policy_number')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
