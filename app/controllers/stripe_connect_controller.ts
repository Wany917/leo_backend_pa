import type { HttpContext } from '@adonisjs/core/http'
import StripeService from '#services/stripe_service'
import Livreur from '#models/livreur'
import Client from '#models/client'
import Prestataire from '#models/prestataire'
import PortefeuilleEcodeli from '#models/portefeuille_ecodeli'
import TransactionPortefeuille from '#models/transaction_portefeuille'

export default class StripeConnectController {
  /**
   * Créer un compte Stripe Connect Express pour un livreur
   */
  async createExpressAccount({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { country = 'FR' } = request.only(['country'])

      // Vérifier que l'utilisateur est un livreur
      const livreur = await Livreur.query().where('id', user.id).first()

      if (!livreur) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non trouvé en tant que livreur',
        })
      }

      // Vérifier si un compte Connect existe déjà
      if (livreur.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: 'Un compte Stripe Connect existe déjà pour ce livreur',
          stripe_account_id: livreur.stripeAccountId,
        })
      }

      // Créer le compte Stripe Connect Express
      const stripeAccountId = await StripeService.createExpressAccountForDeliveryman(
        livreur.id,
        user.email,
        country
      )

      // Sauvegarder l'ID du compte dans la base de données
      livreur.stripeAccountId = stripeAccountId
      await livreur.save()

      console.log(`✅ Compte Connect créé pour livreur ${livreur.id}: ${stripeAccountId}`)

      return response.ok({
        success: true,
        message: 'Compte Stripe Connect créé avec succès',
        data: {
          stripe_account_id: stripeAccountId,
          onboarding_required: true,
        },
      })
    } catch (error) {
      console.error('❌ Erreur création compte Connect:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du compte Stripe Connect',
        error: error.message,
      })
    }
  }

  /**
   * Créer un lien d'onboarding pour configurer le compte Connect
   */
  async createOnboardingLink({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { returnUrl: requestReturnUrl, refreshUrl: requestRefreshUrl } = request.only([
        'returnUrl',
        'refreshUrl',
      ])

      // URLs par défaut si non fournies
      const returnUrl =
        requestReturnUrl || `${process.env.FRONTEND_URL}/app_deliveryman/wallet?onboarding=success`
      const refreshUrl =
        requestRefreshUrl || `${process.env.FRONTEND_URL}/app_deliveryman/wallet?onboarding=refresh`

      // Récupérer le livreur
      const livreur = await Livreur.query().where('id', user.id).first()

      if (!livreur || !livreur.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: "Aucun compte Stripe Connect trouvé. Créez d'abord un compte.",
        })
      }

      // Créer le lien d'onboarding
      const onboardingUrl = await StripeService.createAccountOnboardingLink(
        livreur.stripeAccountId,
        returnUrl,
        refreshUrl
      )

      return response.ok({
        success: true,
        message: "Lien d'onboarding créé",
        data: {
          onboarding_url: onboardingUrl,
        },
      })
    } catch (error) {
      console.error('❌ Erreur création lien onboarding:', error)
      return response.internalServerError({
        success: false,
        message: "Erreur lors de la création du lien d'onboarding",
        error: error.message,
      })
    }
  }

  /**
   * Vérifier le statut du compte Connect
   */
  async checkAccountStatus({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      const livreur = await Livreur.query().where('id', user.id).first()

      if (!livreur || !livreur.stripeAccountId) {
        return response.ok({
          success: true,
          data: {
            has_account: false,
            message: 'Aucun compte Stripe Connect configuré',
          },
        })
      }

      // Vérifier le statut du compte
      const status = await StripeService.checkAccountStatus(livreur.stripeAccountId)

      return response.ok({
        success: true,
        data: {
          has_account: true,
          stripe_account_id: livreur.stripeAccountId,
          charges_enabled: status.charges_enabled,
          payouts_enabled: status.payouts_enabled,
          details_submitted: status.details_submitted,
          requirements: status.requirements,
          ready_for_payouts: status.payouts_enabled && status.details_submitted,
        },
      })
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la vérification du statut',
        error: error.message,
      })
    }
  }

  /**
   * Créer un lien vers le dashboard Express
   */
  async createDashboardLink({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      const livreur = await Livreur.query().where('id', user.id).first()

      if (!livreur || !livreur.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: 'Aucun compte Stripe Connect trouvé',
        })
      }

      const dashboardUrl = await StripeService.createExpressDashboardLink(livreur.stripeAccountId)

      return response.ok({
        success: true,
        data: {
          dashboard_url: dashboardUrl,
        },
      })
    } catch (error) {
      console.error('❌ Erreur création lien dashboard:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du lien dashboard',
        error: error.message,
      })
    }
  }

  /**
   * 💰 EFFECTUER UN VIREMENT DEPUIS LE PORTEFEUILLE
   * Transfert des fonds du portefeuille EcoDeli vers le compte Stripe Connect
   */
  async transferFromWallet({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { montant } = request.only(['montant'])

      if (!montant || montant <= 0) {
        return response.badRequest({
          success: false,
          message: 'Montant invalide',
        })
      }

      // Récupérer le livreur et son compte Connect
      const livreur = await Livreur.query().where('id', user.id).first()

      if (!livreur || !livreur.stripeAccountId) {
        return response.badRequest({
          success: false,
          message:
            "Aucun compte Stripe Connect configuré. Configurez d'abord votre compte bancaire.",
        })
      }

      // Vérifier que le compte Connect est prêt pour les virements
      const status = await StripeService.checkAccountStatus(livreur.stripeAccountId)
      if (!status.payouts_enabled) {
        return response.badRequest({
          success: false,
          message:
            "Votre compte Stripe Connect n'est pas encore prêt pour les virements. Complétez la configuration.",
        })
      }

      // Récupérer le portefeuille
      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        return response.badRequest({
          success: false,
          message: 'Portefeuille non trouvé',
        })
      }

      // Vérifier le solde disponible
      if (portefeuille.soldeDisponible < montant) {
        return response.badRequest({
          success: false,
          message: `Solde insuffisant. Disponible: ${portefeuille.soldeDisponible}€, Demandé: ${montant}€`,
        })
      }

      // Effectuer le transfer vers Stripe Connect
      const transferResult = await StripeService.transferFromWalletToDeliveryman(
        montant,
        livreur.stripeAccountId,
        `Virement livreur #${livreur.id} depuis portefeuille EcoDeli`
      )

      // Débiter le portefeuille
      await portefeuille.retirerFonds(montant)

      // Enregistrer la transaction
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: user.id,
        typeTransaction: 'virement',
        montant: montant,
        soldeAvant: portefeuille.soldeDisponible + montant,
        soldeApres: portefeuille.soldeDisponible,
        description: `Virement vers compte bancaire via Stripe Connect`,
        referenceExterne: transferResult.transfer_id,
        statut: 'completed',
        metadata: JSON.stringify({
          stripe_account_id: livreur.stripeAccountId,
          transfer_type: 'wallet_to_bank',
          transfer_method: 'stripe_connect',
        }),
      })

      console.log(`💸 Virement effectué: ${montant}€ pour livreur ${livreur.id}`)

      return response.ok({
        success: true,
        message: `Virement de ${montant}€ effectué avec succès. Les fonds arriveront sur votre compte bancaire sous 1-3 jours ouvrés.`,
        data: {
          montant_vire: montant,
          nouveau_solde: portefeuille.soldeDisponible,
          transfer_id: transferResult.transfer_id,
          estimated_arrival: '1-3 jours ouvrés',
        },
      })
    } catch (error) {
      console.error('❌ Erreur virement depuis portefeuille:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors du virement',
        error: error.message,
      })
    }
  }

  /**
   * Configurer les virements automatiques
   */
  async configureAutomaticPayouts({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { schedule = 'daily', delayDays = 2 } = request.only(['schedule', 'delayDays'])

      const livreur = await Livreur.query().where('id', user.id).first()

      if (!livreur || !livreur.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: 'Aucun compte Stripe Connect trouvé',
        })
      }

      await StripeService.configureAutomaticPayouts(livreur.stripeAccountId, schedule, delayDays)

      return response.ok({
        success: true,
        message: 'Virements automatiques configurés avec succès',
        data: {
          schedule,
          delayDays,
        },
      })
    } catch (error) {
      console.error('❌ Erreur configuration virements auto:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la configuration des virements automatiques',
        error: error.message,
      })
    }
  }

  // ===============================================
  // 🆕 SYSTÈME CLIENT MULTI-RÔLES - STRIPE CONNECT
  // ===============================================

  /**
   * 🏦 CRÉER UN COMPTE STRIPE CONNECT POUR CLIENT MULTI-RÔLES
   * Permet aux clients qui proposent des services de recevoir des paiements
   */
  async createClientExpressAccount({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { country = 'FR' } = request.only(['country'])

      // Vérifier que l'utilisateur est un client
      const client = await Client.query().where('id', user.id).first()

      if (!client) {
        return response.badRequest({
          success: false,
          message: 'Utilisateur non trouvé en tant que client',
        })
      }

      // Vérifier si l'utilisateur est aussi prestataire (multi-rôle)
      const prestataire = await Prestataire.query().where('id', user.id).first()

      // Vérifier si un compte Connect existe déjà
      if (client.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: 'Un compte Stripe Connect existe déjà pour ce client',
          stripe_account_id: client.stripeAccountId,
        })
      }

      // Créer le compte Stripe Connect Express pour client
      const stripeAccountId = await StripeService.createExpressAccountForClient(
        client.id,
        user.email,
        country,
        !!prestataire // Indique si c'est aussi un prestataire
      )

      // Sauvegarder l'ID du compte dans la base de données
      client.stripeAccountId = stripeAccountId
      await client.save()

      console.log(`✅ Compte Connect créé pour client ${client.id}: ${stripeAccountId}`)

      return response.ok({
        success: true,
        message: 'Compte Stripe Connect créé avec succès',
        data: {
          stripe_account_id: stripeAccountId,
          onboarding_required: true,
          is_service_provider: !!prestataire,
        },
      })
    } catch (error) {
      console.error('❌ Erreur création compte Connect client:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du compte Stripe Connect',
        error: error.message,
      })
    }
  }

  /**
   * 🔗 CRÉER LIEN ONBOARDING POUR CLIENT
   */
  async createClientOnboardingLink({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { returnUrl: requestReturnUrl, refreshUrl: requestRefreshUrl } = request.only([
        'returnUrl',
        'refreshUrl',
      ])

      // URLs par défaut selon le type de client
      const prestataire = await Prestataire.query().where('id', user.id).first()
      const baseUrl = prestataire
        ? `${process.env.FRONTEND_URL}/app_service-provider/payments`
        : `${process.env.FRONTEND_URL}/app_client/wallet`

      const returnUrl = requestReturnUrl || `${baseUrl}?onboarding=success`
      const refreshUrl = requestRefreshUrl || `${baseUrl}?onboarding=refresh`

      // Récupérer le client
      const client = await Client.query().where('id', user.id).first()

      if (!client || !client.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: "Aucun compte Stripe Connect trouvé. Créez d'abord un compte.",
        })
      }

      // Créer le lien d'onboarding
      const onboardingUrl = await StripeService.createAccountOnboardingLink(
        client.stripeAccountId,
        returnUrl,
        refreshUrl
      )

      return response.ok({
        success: true,
        message: "Lien d'onboarding créé pour client",
        data: {
          onboarding_url: onboardingUrl,
        },
      })
    } catch (error) {
      console.error('❌ Erreur création lien onboarding client:', error)
      return response.internalServerError({
        success: false,
        message: "Erreur lors de la création du lien d'onboarding",
        error: error.message,
      })
    }
  }

  /**
   * ✅ VÉRIFIER STATUT COMPTE CLIENT
   */
  async checkClientAccountStatus({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      const client = await Client.query().where('id', user.id).first()

      if (!client || !client.stripeAccountId) {
        return response.ok({
          success: true,
          data: {
            has_account: false,
            message: 'Aucun compte Stripe Connect configuré',
          },
        })
      }

      // Vérifier le statut du compte
      const status = await StripeService.checkAccountStatus(client.stripeAccountId)

      return response.ok({
        success: true,
        data: {
          has_account: true,
          stripe_account_id: client.stripeAccountId,
          charges_enabled: status.charges_enabled,
          payouts_enabled: status.payouts_enabled,
          details_submitted: status.details_submitted,
          requirements: status.requirements,
          ready_for_payouts: status.payouts_enabled && status.details_submitted,
        },
      })
    } catch (error) {
      console.error('❌ Erreur vérification statut client:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la vérification du statut',
        error: error.message,
      })
    }
  }

  /**
   * 📊 DASHBOARD STRIPE POUR CLIENT
   */
  async createClientDashboardLink({ response, auth }: HttpContext) {
    try {
      const user = auth.user!

      const client = await Client.query().where('id', user.id).first()

      if (!client || !client.stripeAccountId) {
        return response.badRequest({
          success: false,
          message: 'Aucun compte Stripe Connect trouvé',
        })
      }

      const dashboardUrl = await StripeService.createExpressDashboardLink(client.stripeAccountId)

      return response.ok({
        success: true,
        data: {
          dashboard_url: dashboardUrl,
        },
      })
    } catch (error) {
      console.error('❌ Erreur création lien dashboard client:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la création du lien dashboard',
        error: error.message,
      })
    }
  }

  /**
   * 💸 VIREMENT CLIENT DEPUIS PORTEFEUILLE
   * Permet aux clients de virer leurs gains vers leur compte bancaire
   */
  async transferFromClientWallet({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { montant } = request.only(['montant'])

      if (!montant || montant <= 0) {
        return response.badRequest({
          success: false,
          message: 'Montant invalide',
        })
      }

      // Récupérer le client et son compte Connect
      const client = await Client.query().where('id', user.id).first()

      if (!client || !client.stripeAccountId) {
        return response.badRequest({
          success: false,
          message:
            "Aucun compte Stripe Connect configuré. Configurez d'abord votre compte bancaire.",
        })
      }

      // Vérifier que le compte Connect est prêt pour les virements
      const status = await StripeService.checkAccountStatus(client.stripeAccountId)
      if (!status.payouts_enabled) {
        return response.badRequest({
          success: false,
          message:
            "Votre compte Stripe Connect n'est pas encore prêt pour les virements. Complétez la configuration.",
        })
      }

      // Récupérer le portefeuille
      const portefeuille = await PortefeuilleEcodeli.query()
        .where('utilisateur_id', user.id)
        .where('is_active', true)
        .first()

      if (!portefeuille) {
        return response.badRequest({
          success: false,
          message: 'Portefeuille non trouvé',
        })
      }

      // Vérifier le solde disponible
      if (portefeuille.soldeDisponible < montant) {
        return response.badRequest({
          success: false,
          message: `Solde insuffisant. Disponible: ${portefeuille.soldeDisponible}€, Demandé: ${montant}€`,
        })
      }

      // Effectuer le transfer vers Stripe Connect
      const transferResult = await StripeService.transferFromWalletToClient(
        montant,
        client.stripeAccountId,
        `Virement client #${client.id} depuis portefeuille EcoDeli`
      )

      // Débiter le portefeuille
      await portefeuille.retirerFonds(montant)

      // Enregistrer la transaction
      await TransactionPortefeuille.create({
        portefeuilleId: portefeuille.id,
        utilisateurId: user.id,
        typeTransaction: 'virement',
        montant: montant,
        soldeAvant: portefeuille.soldeDisponible + montant,
        soldeApres: portefeuille.soldeDisponible,
        description: `Virement vers compte bancaire via Stripe Connect`,
        referenceExterne: transferResult.transfer_id,
        statut: 'completed',
        metadata: JSON.stringify({
          stripe_account_id: client.stripeAccountId,
          transfer_type: 'client_wallet_to_bank',
          transfer_method: 'stripe_connect',
        }),
      })

      console.log(`💸 Virement effectué: ${montant}€ pour client ${client.id}`)

      return response.ok({
        success: true,
        message: `Virement de ${montant}€ effectué avec succès. Les fonds arriveront sur votre compte bancaire sous 1-3 jours ouvrés.`,
        data: {
          montant_vire: montant,
          nouveau_solde: portefeuille.soldeDisponible,
          transfer_id: transferResult.transfer_id,
          estimated_arrival: '1-3 jours ouvrés',
        },
      })
    } catch (error) {
      console.error('❌ Erreur virement client depuis portefeuille:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors du virement',
        error: error.message,
      })
    }
  }
}
