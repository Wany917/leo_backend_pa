import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('utilisateur_id').unsigned().notNullable()
      table.enum('subscription_type', ['free', 'starter', 'premium']).defaultTo('free')
      table.decimal('monthly_price', 8, 2).defaultTo(0.0)
      table.timestamp('start_date').notNullable()
      table.timestamp('end_date').nullable()
      table.enum('status', ['active', 'expired', 'cancelled']).defaultTo('active')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('utilisateur_id').references('id').inTable('utilisateurs').onDelete('CASCADE')
      table.index(['utilisateur_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
