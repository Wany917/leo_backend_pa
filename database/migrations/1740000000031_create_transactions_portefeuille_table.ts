import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions_portefeuille'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('portefeuille_id')
        .unsigned()
        .references('id')
        .inTable('portefeuille_ecodeli')
        .onDelete('CASCADE')
      table
        .integer('utilisateur_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table
        .enum('type_transaction', ['credit', 'debit', 'liberation', 'virement', 'commission'])
        .notNullable()
      table.decimal('montant', 10, 2).notNullable()
      table.decimal('solde_avant', 10, 2).notNullable()
      table.decimal('solde_apres', 10, 2).notNullable()
      table.string('description').notNullable()
      table.string('reference_externe').nullable().comment('ID Stripe, référence virement, etc.')
      table.integer('livraison_id').unsigned().references('id').inTable('livraisons').nullable()
      table.integer('service_id').unsigned().references('id').inTable('services').nullable()
      table.enum('statut', ['pending', 'completed', 'failed', 'cancelled']).defaultTo('completed')
      table.json('metadata').nullable().comment('Données additionnelles en JSON')
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index pour performance
      table.index(['portefeuille_id'])
      table.index(['utilisateur_id'])
      table.index(['type_transaction'])
      table.index(['statut'])
      table.index(['created_at'])
      table.index(['reference_externe'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
