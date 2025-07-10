import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Contract from '#models/contract'
import ContractPlan from '#models/contract_plan'
import Utilisateurs from '#models/utilisateurs'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des contrats existent déjà
    const existingContracts = await Contract.query().limit(1)
    if (existingContracts.length > 0) {
      console.log('Des contrats existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES COMMERÇANTS EXISTANTS PAR EMAIL
    const francois = await Utilisateurs.findBy('email', 'contact@epiceriefine-paris.fr')
    const nathalie = await Utilisateurs.findBy('email', 'contact@savons-paris.fr')

    if (!francois || !nathalie) {
      console.log('❌ Commerçants non trouvés pour les contrats')
      return
    }

    // ✅ RÉCUPÉRER LES PLANS DE CONTRATS EXISTANTS
    const basicPlan = await ContractPlan.findBy('name', 'Basic')
    const standardPlan = await ContractPlan.findBy('name', 'Standard')
    const ultimatePlan = await ContractPlan.findBy('name', 'Ultimate')

    if (!basicPlan || !standardPlan || !ultimatePlan) {
      console.log('❌ Plans de contrats non trouvés, seeder ignoré')
      return
    }

    // ✅ CONTRATS ECODELI - BASÉS SUR LA STRUCTURE RÉELLE DE LA TABLE
    const contracts = [
      // =================================================================
      // 📊 CONTRAT ACTIF - Épicerie Fine Montmartre (Plan Standard)
      // =================================================================
      {
        commercantId: francois.id,
        contractPlanId: standardPlan.id,
        startDate: DateTime.now().minus({ months: 6 }), // Commencé il y a 6 mois
        endDate: DateTime.now().plus({ months: 6 }), // Se termine dans 6 mois
        status: 'active' as const,
        createdAt: DateTime.now().minus({ months: 6 }),
        updatedAt: DateTime.now().minus({ weeks: 2 }),
      },

      // =================================================================
      // 🟡 CONTRAT EXPIRÉ - Savons de Paris (Plan Basic)
      // =================================================================
      {
        commercantId: nathalie.id,
        contractPlanId: basicPlan.id,
        startDate: DateTime.now().minus({ months: 18 }), // Commencé il y a 18 mois
        endDate: DateTime.now().minus({ months: 6 }), // Expiré il y a 6 mois
        status: 'expired' as const,
        createdAt: DateTime.now().minus({ months: 18 }),
        updatedAt: DateTime.now().minus({ months: 6 }),
      },

      // =================================================================
      // 🆕 NOUVEAU CONTRAT ACTIF - Épicerie Fine (Upgrade vers Ultimate)
      // =================================================================
      {
        commercantId: francois.id,
        contractPlanId: ultimatePlan.id,
        startDate: DateTime.now().minus({ weeks: 2 }), // Commencé il y a 2 semaines
        endDate: DateTime.now().plus({ months: 12 }), // Se termine dans 12 mois
        status: 'active' as const,
        createdAt: DateTime.now().minus({ weeks: 2 }),
        updatedAt: DateTime.now().minus({ days: 1 }),
      },

      // =================================================================
      // ❌ CONTRAT ANNULÉ - Savons de Paris (Plan Standard - Annulé)
      // =================================================================
      {
        commercantId: nathalie.id,
        contractPlanId: standardPlan.id,
        startDate: DateTime.now().minus({ months: 3 }), // Commencé il y a 3 mois
        endDate: DateTime.now().minus({ weeks: 4 }), // Annulé il y a 4 semaines
        status: 'cancelled' as const,
        createdAt: DateTime.now().minus({ months: 3 }),
        updatedAt: DateTime.now().minus({ weeks: 4 }),
      },
    ]

    // ✅ CRÉER LES CONTRATS AVEC GESTION D'ERREURS
    for (const contractData of contracts) {
      try {
        await Contract.create(contractData)
        const planName =
          contractData.contractPlanId === basicPlan.id
            ? 'Basic'
            : contractData.contractPlanId === standardPlan.id
              ? 'Standard'
              : 'Ultimate'
        console.log(
          `✅ Contrat créé: Commerçant ID ${contractData.commercantId} - Plan ${planName} (${contractData.status})`
        )
      } catch (error) {
        console.log(`❌ Erreur création contrat:`, error.message)
      }
    }

    console.log(`✅ ${contracts.length} contrats de commerçants créés avec succès`)
    console.log('📊 Répartition des contrats:')
    console.log('   - Actifs: 2 contrats')
    console.log('   - Expirés: 1 contrat')
    console.log('   - Annulés: 1 contrat')
    console.log('📋 Plans utilisés:')
    console.log(`   - Basic: ${basicPlan.price}€/mois`)
    console.log(`   - Standard: ${standardPlan.price}€/mois`)
    console.log(`   - Ultimate: ${ultimatePlan.price}€/mois`)
    console.log('📈 Commerçants avec contrats:')
    console.log(
      `   - François Dubois (Épicerie Fine): ${contracts.filter((c) => c.commercantId === francois.id).length} contrats`
    )
    console.log(
      `   - Nathalie Sanchez (Savons de Paris): ${contracts.filter((c) => c.commercantId === nathalie.id).length} contrats`
    )
  }
}
