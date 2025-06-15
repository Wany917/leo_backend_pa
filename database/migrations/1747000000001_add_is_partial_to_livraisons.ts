import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livraisons'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_partial').defaultTo(false)
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_partial')
    })
  }
}
