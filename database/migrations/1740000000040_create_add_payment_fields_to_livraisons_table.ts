import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livraisons'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('payment_status', ['unpaid', 'pending', 'paid']).defaultTo('unpaid')
      table.string('payment_intent_id').nullable()
      table.decimal('amount', 10, 2).nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('payment_status')
      table.dropColumn('payment_intent_id')
      table.dropColumn('amount')
    })
  }
}
