import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Ajouter les nouveaux champs datetime
      table.dateTime('start_datetime').nullable()
      table.dateTime('end_datetime').nullable()
    })

    // Migrer les données existantes si nécessaire
    // booking_date -> start_datetime (on garde la même valeur)
    // end_datetime sera calculé en ajoutant 1 heure par défaut
    this.schema.raw(`
      UPDATE ${this.tableName} 
      SET start_datetime = booking_date,
          end_datetime = booking_date + INTERVAL '1 hour'
      WHERE start_datetime IS NULL
    `)

    // Rendre les nouveaux champs obligatoires
    this.schema.alterTable(this.tableName, (table) => {
      table.dateTime('start_datetime').notNullable().alter()
      table.dateTime('end_datetime').notNullable().alter()
    })

    // Supprimer l'ancien champ booking_date
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('booking_date')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remettre l'ancien champ
      table.dateTime('booking_date').nullable()
    })

    // Migrer les données de retour
    this.schema.raw(`
      UPDATE ${this.tableName} 
      SET booking_date = start_datetime
      WHERE booking_date IS NULL
    `)

    this.schema.alterTable(this.tableName, (table) => {
      table.dateTime('booking_date').notNullable().alter()
      // Supprimer les nouveaux champs
      table.dropColumn('start_datetime')
      table.dropColumn('end_datetime')
    })
  }
}
