import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '#validators/login'
import { registerValidator } from '#validators/register'
import Utilisateurs from '#models/utilisateurs'
import Subscription from '#models/subscription'
import AccessToken from '#models/access_token'
import { DateTime } from 'luxon'

export default class AuthController {
  async login({ request, response }: HttpContext) {
    try {
      const { email, password } = await request.validateUsing(loginValidator)

      const user = await Utilisateurs.verifyCredentials(email, password)

      if (user.state === 'closed') {
        return response.status(403).send({
          error_message:
            'This account has been closed. Reach out to the support team for further assistance',
        })
      }
      if (user.state === 'banned') {
        return response.status(403).send({
          error_message:
            'This account has been banned. Reach out to the support team to plead your case',
        })
      }

      const token = await Utilisateurs.accessTokens.create(user)
      return response.ok({
        user: user.serialize(),
        token: token.value!.release(),
      })
    } catch (error) {
      console.log(error)
      return response.status(401).send({ error_message: 'Unauthorized access', error: error })
    }
  }

  async register({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerValidator)

      const existingUtilisateurs = await Utilisateurs.findBy('email', payload.email)
      if (existingUtilisateurs) {
        if (existingUtilisateurs.state === 'closed') {
          return response.status(403).send({
            error_message:
              'This account has been closed. Reach out to the support team for further assistance',
          })
        }
        if (existingUtilisateurs.state === 'banned') {
          return response.status(403).send({
            error_message:
              'This account has been banned. Reach out to the support team to plead your case',
          })
        }
        return response.status(400).send({ error_message: 'This email address is already used' })
      }

      if (payload.password !== payload.confirm_password) {
        return response
          .status(400)
          .send({ error_message: 'Password and confirmation do not match' })
      }

      const user = await Utilisateurs.create({
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        password: payload.password,
        phone_number: payload.phone_number || null,
        address: payload.address || null,
        city: payload.city,
        postalCode: payload.postalCode,
        country: payload.country,
      })

      await Subscription.create({
        utilisateur_id: user.id,
        subscription_type: 'free',
        status: 'active',
        start_date: DateTime.now(),
      })

      const token = await Utilisateurs.accessTokens.create(user)

      return response.created({ user: user, token: token.value!.release() })
    } catch (error) {
      response.status(400).send({ error_message: error })
    }
  }

  async me({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()

      // Récupérer l'utilisateur avec toutes ses relations
      const fullUser = await Utilisateurs.query()
        .where('id', user.id)
        .preload('admin' as any)
        .preload('client' as any)
        .preload('livreur' as any)
        .preload('prestataire' as any)
        .preload('commercant' as any)
        .firstOrFail()

      // Check if account is closed, banned, or deactivated
      if (fullUser.state === 'closed' || fullUser.state === 'banned') {
        return response.status(403).send({
          error_message: 'Account unavailable. Please contact support.',
          account_status: fullUser.state,
          redirect_to_home: true
        })
      }

      // Ajouter le rôle à la réponse
      const userData = fullUser.serialize()

      return response.ok(userData)
    } catch (error) {
      return response.status(401).send({ message: 'Unauthorized access' })
    }
  }

  async remove_token({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const token = await AccessToken.findBy('tokenableId', user.id)
      if (token) {
        await token.delete()
      }
      return response.ok({ message: 'Token deleted successfully' })
    } catch (error) {
      return response.status(401).send({ message: 'Unauthorized access' })
    }
  }
}
