import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ContractPlan from '#models/contract_plan'

export default class extends BaseSeeder {
  async run() {
    const plans = [
      {
        name: 'Basic',
        description: 'Includes only free setup, bandwidth quota, and user connection features.',
        price: 14.99,
        currency: 'GBP',
        features: {
          freeSetup: true,
          bandwidthLimit: true,
          userConnection: true,
          analyticsReport: false,
          publicApiAccess: false,
          pluginsIntegration: false,
          customContentManagement: false,
        },
      },
      {
        name: 'Standard',
        description: 'Adds analytics reporting and public API access to the first three features.',
        price: 49.99,
        currency: 'GBP',
        features: {
          freeSetup: true,
          bandwidthLimit: true,
          userConnection: true,
          analyticsReport: true,
          publicApiAccess: true,
          pluginsIntegration: false,
          customContentManagement: false,
        },
      },
      {
        name: 'Ultimate',
        description:
          'Unlocks all options, including plugin integration and custom content management.',
        price: 89.99,
        currency: 'GBP',
        features: {
          freeSetup: true,
          bandwidthLimit: true,
          userConnection: true,
          analyticsReport: true,
          publicApiAccess: true,
          pluginsIntegration: true,
          customContentManagement: true,
        },
      },
    ]

    for (const planData of plans) {
      await ContractPlan.updateOrCreate({ name: planData.name }, planData)
    }

    console.log('✅ Contract plans (Basic, Standard, Ultimate) created/updated.')
  }
}
