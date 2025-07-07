import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livreurs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('stripe_account_id')
        .nullable()
        .comment('ID du compte Stripe Connect Express pour virements automatiques')
      table.index(['stripe_account_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stripe_account_id')
    })
  }
}
