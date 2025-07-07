import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'livreurs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('utilisateur_id')
        .unsigned()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table.string('numero_permis').nullable()
      table.string('type_vehicule').nullable()
      table.string('plaque_immatriculation').nullable()
      table.string('numero_assurance').nullable()
      table.date('date_expiration_assurance').nullable()
      table.boolean('disponible').defaultTo(true)
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()
      table.timestamp('derniere_position').nullable()
      table.boolean('en_service').defaultTo(false)
      table
        .string('stripe_account_id')
        .nullable()
        .comment('ID du compte Stripe Connect Express pour virements automatiques')
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index pour les recherches géographiques
      table.index(['latitude', 'longitude'])
      table.index(['disponible', 'en_service'])
      table.index(['stripe_account_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
