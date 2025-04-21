import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddLivraisonIdToColisTable extends BaseSchema {
  protected tableName = 'colis'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('livraison_id').unsigned().nullable()
      table
        .foreign('livraison_id')
        .references('id')
        .inTable('livraisons')
        .onDelete('SET NULL')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['livraison_id'])
      table.dropColumn('livraison_id')
    })
  }
}