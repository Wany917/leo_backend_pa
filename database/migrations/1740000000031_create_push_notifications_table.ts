import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'push_notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('utilisateurs')
        .onDelete('CASCADE')
      table.string('title').notNullable()
      table.text('body').notNullable()
      table.json('data').nullable() // Données supplémentaires (deep links, etc.)
      table
        .enum('type', [
          'delivery_update',
          'new_message',
          'payment_received',
          'service_booked',
          'service_reminder',
          'promotion',
          'system',
        ])
        .notNullable()
      table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal')
      table.enum('status', ['pending', 'sent', 'failed', 'cancelled']).defaultTo('pending')
      table.string('onesignal_id').nullable() // ID de notification OneSignal
      table.integer('retry_count').defaultTo(0)
      table.text('error_message').nullable()
      table.boolean('is_read').defaultTo(false)
      table.timestamp('sent_at').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('scheduled_for').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['user_id', 'status'])
      table.index(['type', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
