import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'services'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('pricing_type', ['fixed', 'hourly', 'custom']).defaultTo('fixed').after('price')
      table.decimal('hourly_rate', 10, 2).nullable().after('pricing_type')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pricing_type')
      table.dropColumn('hourly_rate')
    })
  }
}
