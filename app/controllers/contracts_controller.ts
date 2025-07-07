import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import Contract from '#models/contract'
import ContractPlan from '#models/contract_plan'
import Commercant from '#models/commercant'
import { contractValidator } from '#validators/contract'

export default class ContractsController {
  async getPlans({ response }: HttpContext) {
    try {
      const plans = await ContractPlan.all()
      return response.ok(plans)
    } catch (error) {
      return response.internalServerError({
        message: 'Erreur lors de la récupération des plans.',
        error: error.message,
      })
    }
  }

  async getCurrent({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commercant = await Commercant.find(user.id)
      if (!commercant) {
        return response.notFound({ message: 'Profil commerçant non trouvé.' })
      }

      const activeContract = await Contract.query()
        .where('commercant_id', commercant.id)
        .where('status', 'active')
        .preload('contractPlan')
        .first()

      if (!activeContract) {
        return response.notFound({ message: 'Aucun contrat actif trouvé.' })
      }

      return response.ok(activeContract)
    } catch (error) {
      return response.internalServerError({
        message: 'Erreur serveur.',
        error: error.toString(),
      })
    }
  }

  async subscribe({ auth, request, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commercant = await Commercant.find(user.id)
      if (!commercant) {
        return response.notFound({ message: 'Profil commerçant non trouvé.' })
      }

      const { planId } = await request.validateUsing(contractValidator)

      const plan = await ContractPlan.find(planId)
      if (!plan) {
        return response.notFound({ message: 'Plan de contrat non trouvé.' })
      }

      const existingContract = await Contract.query()
        .where('commercant_id', commercant.id)
        .where('status', 'active')
        .first()

      if (existingContract) {
        return response.conflict({
          message: 'Un contrat actif existe déjà. Veuillez changer de plan ou le résilier.',
        })
      }

      const newContract = await Contract.create({
        commercantId: commercant.id,
        contractPlanId: plan.id,
        startDate: DateTime.now(),
        endDate: DateTime.now().plus({ years: 1 }),
        status: 'active',
      })

      await newContract.load('contractPlan')
      return response.created(newContract)
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.status(422).send(error.messages)
      }
      return response.internalServerError({ message: 'Erreur serveur.', error: error.toString() })
    }
  }

  async switchPlan({ auth, request, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commercant = await Commercant.find(user.id)
      if (!commercant) {
        return response.notFound({ message: 'Profil commerçant non trouvé.' })
      }

      const { planId: newPlanId } = await request.validateUsing(contractValidator)

      const newPlan = await ContractPlan.find(newPlanId)
      if (!newPlan) {
        return response.notFound({ message: 'Nouveau plan non trouvé.' })
      }

      const activeContract = await Contract.query()
        .where('commercant_id', commercant.id)
        .where('status', 'active')
        .first()

      if (activeContract) {
        if (activeContract.contractPlanId === newPlan.id) {
          return response.conflict({ message: 'Vous êtes déjà abonné à ce plan.' })
        }
        activeContract.status = 'cancelled'
        activeContract.endDate = DateTime.now()
        await activeContract.save()
      }

      const newContract = await Contract.create({
        commercantId: commercant.id,
        contractPlanId: newPlan.id,
        startDate: DateTime.now(),
        endDate: DateTime.now().plus({ years: 1 }),
        status: 'active',
      })

      await newContract.load('contractPlan')
      return response.ok(newContract)
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.status(422).send(error.messages)
      }
      return response.internalServerError({ message: 'Erreur serveur.', error: error.toString() })
    }
  }

  async unsubscribe({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commercant = await Commercant.find(user.id)
      if (!commercant) {
        return response.notFound({ message: 'Profil commerçant non trouvé.' })
      }

      const activeContract = await Contract.query()
        .where('commercant_id', commercant.id)
        .where('status', 'active')
        .first()

      if (!activeContract) {
        return response.notFound({ message: 'Aucun contrat actif à résilier.' })
      }

      activeContract.status = 'cancelled'
      activeContract.endDate = DateTime.now()
      await activeContract.save()

      return response.ok({ message: 'Contrat résilié avec succès.' })
    } catch (error) {
      return response.internalServerError({ message: 'Erreur serveur.', error: error.toString() })
    }
  }
}
