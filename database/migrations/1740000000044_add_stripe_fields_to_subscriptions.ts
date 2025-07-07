import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('stripe_subscription_id')
        .nullable()
        .unique()
        .comment('ID abonnement Stripe pour synchronisation')
      table.string('stripe_customer_id').nullable().comment('ID client Stripe')
      table.string('stripe_price_id').nullable().comment('ID du plan Stripe (price_xxx)')
      table.json('stripe_metadata').nullable().comment('Métadonnées Stripe supplémentaires')

      // Index pour performance
      table.index(['stripe_subscription_id'])
      table.index(['stripe_customer_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stripe_subscription_id')
      table.dropColumn('stripe_customer_id')
      table.dropColumn('stripe_price_id')
      table.dropColumn('stripe_metadata')
    })
  }
}
