import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'portefeuille_ecodeli'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('utilisateur_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table
        .decimal('solde_disponible', 10, 2)
        .defaultTo(0.0)
        .comment('Solde disponible pour retrait')
      table
        .decimal('solde_en_attente', 10, 2)
        .defaultTo(0.0)
        .comment('Fonds bloqués en attente de validation')
      table.string('iban').nullable().comment('IBAN pour virements automatiques')
      table.string('bic').nullable().comment('BIC associé')
      table.boolean('virement_auto_actif').defaultTo(false).comment('Virement automatique activé')
      table
        .decimal('seuil_virement_auto', 10, 2)
        .defaultTo(50.0)
        .comment('Seuil déclenchement virement auto')
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index pour performance
      table.index(['utilisateur_id'])
      table.index(['is_active'])
      table.unique(['utilisateur_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
