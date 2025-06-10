import type { HttpContext } from '@adonisjs/core/http'
import Subscription from '#models/subscription'
import { createSubscriptionValidator, updateSubscriptionValidator } from '#validators/subscription'
import { DateTime } from 'luxon'

export default class SubscriptionsController {
  async index({ response }: HttpContext) {
    try {
      const subscriptions = await Subscription.query()
        .select('*')
        .from('subscriptions')
        .innerJoin('utilisateurs', 'subscriptions.utilisateur_id', 'utilisateurs.id')
        .orderBy('subscriptions.created_at', 'desc')

      return response.ok({
        message: 'Subscriptions retrieved successfully',
        subscriptions: subscriptions.map((sub) => ({
          ...sub.serialize(),
          utilisateur: {
            id: sub.utilisateur.id,
            first_name: sub.utilisateur.first_name,
            last_name: sub.utilisateur.last_name,
            email: sub.utilisateur.email,
          },
        })),
      })
    } catch (error) {
      return response.internalServerError({ message: 'Failed to retrieve subscriptions', error })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const subscription = await Subscription.query()
        .where('utilisateur_id', params.userId)
        .orderBy('created_at', 'desc')
        .first()

      if (!subscription) {
        return response.notFound({ message: 'No subscription found for this user' })
      }

      const features = Subscription.getSubscriptionFeatures()[subscription.subscription_type]

      return response.ok({
        message: 'Subscription retrieved successfully',
        subscription: {
          ...subscription.serialize(),
          features,
          is_active: subscription.isActive,
          is_expired: subscription.isExpired,
        },
      })
    } catch (error) {
      return response.internalServerError({ message: 'Failed to retrieve subscription', error })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const { utilisateur_id, subscription_type } = await request.validateUsing(
        createSubscriptionValidator
      )

      const existingSubscription = await Subscription.query()
        .where('utilisateur_id', utilisateur_id)
        .where('status', 'active')
        .first()

      if (existingSubscription) {
        existingSubscription.status = 'cancelled'
        await existingSubscription.save()
      }

      const prices = Subscription.getSubscriptionPrices()
      const monthlyPrice = prices[subscription_type]

      let endDate = null
      if (subscription_type !== 'free') {
        endDate = DateTime.now().plus({ months: 1 })
      }

      const subscription = await Subscription.create({
        utilisateur_id,
        subscription_type,
        monthly_price: monthlyPrice,
        start_date: DateTime.now(),
        end_date: endDate,
        status: 'active',
      })

      const features = Subscription.getSubscriptionFeatures()[subscription_type]

      return response.created({
        message: 'Subscription created successfully',
        subscription: {
          ...subscription.serialize(),
          features,
        },
      })
    } catch (error) {
      return response.badRequest({ message: 'Failed to create subscription', error })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const subscription = await Subscription.findOrFail(params.id)
      const data = await request.validateUsing(updateSubscriptionValidator)

      if (data.subscription_type && data.subscription_type !== subscription.subscription_type) {
        const prices = Subscription.getSubscriptionPrices()
        subscription.monthly_price = prices[data.subscription_type]

        if (data.subscription_type === 'free') {
          subscription.end_date = null
        } else if (subscription.subscription_type === 'free') {
          subscription.end_date = DateTime.now().plus({ months: 1 })
        }
      }

      subscription.merge(data)
      await subscription.save()

      const features = Subscription.getSubscriptionFeatures()[subscription.subscription_type]

      return response.ok({
        message: 'Subscription updated successfully',
        subscription: {
          ...subscription.serialize(),
          features,
        },
      })
    } catch (error) {
      return response.badRequest({ message: 'Failed to update subscription', error })
    }
  }

  async cancel({ params, response }: HttpContext) {
    try {
      const subscription = await Subscription.findOrFail(params.id)

      subscription.status = 'cancelled'
      await subscription.save()

      return response.ok({
        message: 'Subscription cancelled successfully',
        subscription: subscription.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Failed to cancel subscription', error })
    }
  }

  async plans({ response }: HttpContext) {
    const prices = Subscription.getSubscriptionPrices()
    const features = Subscription.getSubscriptionFeatures()

    const plans = Object.keys(prices).map((type) => ({
      type,
      monthly_price: prices[type as keyof typeof prices],
      features: features[type as keyof typeof features],
    }))

    return response.ok({
      message: 'Subscription plans retrieved successfully',
      plans,
    })
  }

  async checkExpired({ response }: HttpContext) {
    try {
      const now = DateTime.now()

      const expiredSubscriptions = await Subscription.query()
        .where('status', 'active')
        .where('end_date', '<=', now.toSQL())
        .whereNotNull('end_date')

      for (const subscription of expiredSubscriptions) {
        subscription.status = 'expired'
        await subscription.save()
      }

      return response.ok({
        message: `Updated ${expiredSubscriptions.length} expired subscriptions`,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Failed to check expired subscriptions',
        error,
      })
    }
  }
}
