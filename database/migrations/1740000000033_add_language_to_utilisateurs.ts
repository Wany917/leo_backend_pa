import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'utilisateurs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('preferred_language', 5).defaultTo('fr') // Langue préférée
      table.string('onesignal_player_id').nullable() // ID OneSignal pour notifications push
      table.boolean('push_notifications_enabled').defaultTo(true)
      table.boolean('email_notifications_enabled').defaultTo(true)
      table.json('notification_preferences').nullable() // Préférences détaillées par type
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('preferred_language')
      table.dropColumn('onesignal_player_id')
      table.dropColumn('push_notifications_enabled')
      table.dropColumn('email_notifications_enabled')
      table.dropColumn('notification_preferences')
    })
  }
}
