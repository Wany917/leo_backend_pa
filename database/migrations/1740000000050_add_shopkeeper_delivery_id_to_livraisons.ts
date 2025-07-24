import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livraisons'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('shopkeeper_delivery_id').unsigned().nullable()
      table
        .foreign('shopkeeper_delivery_id')
        .references('id')
        .inTable('shopkeeper_deliveries')
        .onDelete('SET NULL')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['shopkeeper_delivery_id'])
      table.dropColumn('shopkeeper_delivery_id')
    })
  }
}