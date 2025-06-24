import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'annonces'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Ajouter les nouveaux champs
      table
        .enum('type', ['transport_colis', 'service_personne'])
        .notNullable()
        .defaultTo('transport_colis')
      table
        .enum('status', ['active', 'pending', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('active')
      table.string('start_location').nullable()
      table.string('end_location').nullable()
      table.decimal('insurance_amount', 10, 2).defaultTo(0)
      table.dateTime('desired_date').nullable()

      // Supprimer les anciens champs qui ne correspondent pas
      table.dropColumn('state')
      table.dropColumn('destination_address')
      table.dropColumn('starting_address')
      table.dropColumn('scheduled_date')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Restaurer les anciens champs
      table.enum('state', ['open', 'pending', 'closed']).defaultTo('open')
      table.string('destination_address').nullable()
      table.string('starting_address').nullable()
      table.dateTime('scheduled_date').nullable()

      // Supprimer les nouveaux champs
      table.dropColumn('type')
      table.dropColumn('status')
      table.dropColumn('start_location')
      table.dropColumn('end_location')
      table.dropColumn('insurance_amount')
      table.dropColumn('desired_date')
    })
  }
}
