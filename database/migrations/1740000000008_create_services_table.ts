import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'services'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('prestataireId').unsigned().notNullable()
      table.string('name').notNullable()
      table.string('description').notNullable()
      table.decimal('price', 10, 2).notNullable()
      table.dateTime('start_date').notNullable()
      table.dateTime('end_date').notNullable()
      table.string('location').notNullable()
      table
        .enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])
        .defaultTo('scheduled')
      table.integer('duration').nullable()
      table.boolean('is_active').defaultTo(true)
      table.integer('service_type_id').unsigned().nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.foreign('prestataireId').references('id').inTable('prestataires').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
