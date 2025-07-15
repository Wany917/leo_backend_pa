import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'services'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('availability_description')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('availability_description', 500).nullable()
    })
  }
}
