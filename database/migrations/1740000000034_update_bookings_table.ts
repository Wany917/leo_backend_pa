import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('total_price', 10, 2).nullable().after('notes')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('total_price')
    })
  }
}
