import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'colis'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('annonce_id').unsigned().nullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Le retour en arrière est un peu plus complexe
      // On assume que toutes les valeurs nulles seront gérées avant ce rollback
      table.integer('annonce_id').unsigned().notNullable().alter()
    })
  }
}
