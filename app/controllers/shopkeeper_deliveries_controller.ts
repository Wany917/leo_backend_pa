import type { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import ShopkeeperDelivery from '#models/shopkeeper_delivery'
import Livraison from '#models/livraison'
import Colis from '#models/colis'
import Ws from '#services/ws'
import { shopkeeperDeliveryValidator } from '#validators/shopkeeper_delivery'
import db from '@adonisjs/lucid/services/db'
import CodeTemporaire from '#models/code_temporaire'
import { validateDeliveryValidator } from '#validators/validate_delivery_validator'

export default class ShopkeeperDeliveriesController {
  /**
   * Crée une nouvelle demande de livraison par un commerçant.
   */
  public async create({ request, auth, response }: HttpContext) {
    try {
      const commercant = await auth.authenticate()
      const payload = await request.validateUsing(shopkeeperDeliveryValidator)

      console.log('📦 Payload reçu:', payload)

      // 1. Générer un numéro de suivi unique pour le colis
      const trackingNumber = `ECO-SHOP-${cuid()}`

      // 2. Créer la demande de livraison
      const deliveryRequest = await ShopkeeperDelivery.create({
        commercantId: commercant.id,
        customerName: payload.customer_name,
        customerEmail: payload.customer_email,
        customerAddress: payload.customer_address,
        productsSummary: payload.products_summary,
        totalWeight: payload.total_weight,
        price: payload.price,
        trackingNumber,
        status: 'pending_acceptance',
      })

      console.log('✅ Demande de livraison créée:', deliveryRequest.serialize())

      // 3. Créer le colis associé (sans annonce pour ce workflow)
      await Colis.create({
        annonceId: null,
        trackingNumber,
        weight: payload.total_weight || 0,
        length: 0,
        width: 0,
        height: 0,
        contentDescription: payload.products_summary,
        status: 'stored',
      })

      console.log('✅ Colis créé avec tracking:', trackingNumber)

      // 4. Notifier les livreurs via WebSocket
      if (Ws.io) {
        Ws.io.emit('new_shopkeeper_delivery', deliveryRequest)
        console.log('📡 Notification WebSocket envoyée')
      }

      // 5. Log des champs additionnels pour debug (même s'ils ne sont pas stockés en DB pour l'instant)
      if (payload.customer_phone) {
        console.log('📞 Téléphone client:', payload.customer_phone)
      }
      if (payload.delivery_type) {
        console.log('🚚 Type de livraison:', payload.delivery_type)
      }
      if (payload.starting_point) {
        console.log('📍 Point de départ:', payload.starting_point)
      }
      if (payload.starting_type) {
        console.log('🏠 Type de départ:', payload.starting_type)
      }
      if (payload.delivery_date) {
        console.log('📅 Date souhaitée:', payload.delivery_date)
      }

      return response.created(deliveryRequest)
    } catch (error) {
      console.error('❌ Error creating shopkeeper delivery:', error)
      return response.badRequest({
        message: 'Failed to create delivery request',
        error: error.messages || error.message,
      })
    }
  }

  /**
   * Permet à un livreur d'accepter une livraison.
   */
  public async accept({ params, auth, response }: HttpContext) {
    const user = await auth.authenticate()

    // Assurer que l'utilisateur est bien un livreur
    const livreur = await db.from('livreurs').where('id', user.id).first()
    if (!livreur) {
      return response.forbidden({ message: 'Only delivery personnel can accept deliveries.' })
    }

    const deliveryRequest = await ShopkeeperDelivery.findOrFail(params.id)

    if (deliveryRequest.status !== 'pending_acceptance') {
      return response.conflict({ message: 'This delivery has already been accepted.' })
    }

    deliveryRequest.livreurId = livreur.id
    deliveryRequest.status = 'accepted'
    await deliveryRequest.save()

    const commercant = await db
      .from('utilisateurs')
      .where('id', deliveryRequest.commercantId)
      .first()

    // Créer une entrée dans la table `livraisons` standard
    await Livraison.create({
      livreurId: livreur.id,
      pickupLocation: commercant?.address || 'Adresse du commerçant non trouvée',
      dropoffLocation: deliveryRequest.customerAddress,
      status: 'scheduled',
      price: deliveryRequest.price,
    })

    // Générer le code de validation
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString()
    await CodeTemporaire.create({
      user_info: deliveryRequest.trackingNumber, // Utiliser le tracking number comme identifiant unique
      code: validationCode,
    })

    // TODO: Envoyer un email au client avec le code et le lien de suivi
    // EmailService.send({
    //   to: deliveryRequest.customerEmail,
    //   subject: `Votre livraison EcoDeli est en route !`,
    //   html: `<h1>Bonjour ${deliveryRequest.customerName},</h1>
    //          <p>Votre commande est acceptée par un livreur.</p>
    //          <p>Suivez votre livraison ici : <a href="http://localhost:3000/app_client/tracking/${deliveryRequest.trackingNumber}">Suivi</a></p>
    //          <p>À la réception, donnez ce code au livreur : <strong>${validationCode}</strong></p>`
    // });

    const updatedDeliveryRequest = await db
      .from('shopkeeper_deliveries')
      .where('shopkeeper_deliveries.id', deliveryRequest.id)
      .leftJoin('utilisateurs', 'shopkeeper_deliveries.livreur_id', 'utilisateurs.id')
      .select(
        'shopkeeper_deliveries.*',
        'utilisateurs.first_name as livreur_first_name',
        'utilisateurs.last_name as livreur_last_name'
      )
      .first()

    return response.ok(updatedDeliveryRequest)
  }

  /**
   * Gère la validation de la livraison par code.
   */
  public async validateDelivery({ request, response }: HttpContext) {
    const { tracking_number, code } = await request.validateUsing(validateDeliveryValidator)

    const codeTemporaire = await CodeTemporaire.query()
      .where('user_info', tracking_number)
      .where('code', code)
      .first()

    if (!codeTemporaire) {
      return response.badRequest({ message: 'Invalid validation code.' })
    }

    // Le code est valide, on peut finaliser la livraison
    await codeTemporaire.delete()

    const deliveryRequest = await ShopkeeperDelivery.findBy('trackingNumber', tracking_number)
    if (!deliveryRequest) {
      return response.notFound({ message: 'Delivery request not found.' })
    }

    deliveryRequest.status = 'delivered'
    await deliveryRequest.save()

    // Mettre à jour les autres entités liées
    if (deliveryRequest.livreurId) {
      const livraison = await Livraison.query()
        .where('dropoffLocation', deliveryRequest.customerAddress)
        .where('livreurId', deliveryRequest.livreurId)
        .first()
      if (livraison) {
        livraison.status = 'completed'
        await livraison.save()
      }
    }

    const colis = await Colis.findBy('trackingNumber', tracking_number)
    if (colis) {
      colis.status = 'delivered'
      await colis.save()
    }

    // TODO: Libérer les fonds pour le livreur

    return response.ok({ message: 'Delivery successfully validated and completed.' })
  }

  /**
   * Récupère les livraisons créées par le commerçant connecté.
   */
  public async getForShopkeeper({ auth, response }: HttpContext) {
    const commercant = await auth.authenticate()
    const deliveries = await db
      .from('shopkeeper_deliveries')
      .where('commercant_id', commercant.id)
      .leftJoin(
        'utilisateurs as livreur_user',
        'shopkeeper_deliveries.livreur_id',
        'livreur_user.id'
      )
      .select(
        'shopkeeper_deliveries.*',
        'livreur_user.first_name as livreur_first_name',
        'livreur_user.last_name as livreur_last_name'
      )
      .orderBy('shopkeeper_deliveries.created_at', 'desc')

    return response.ok(deliveries)
  }

  /**
   * Récupère les livraisons disponibles pour les livreurs.
   */
  public async getAvailable({ response }: HttpContext) {
    const availableDeliveries = await db
      .from('shopkeeper_deliveries')
      .where('status', 'pending_acceptance')
      .join(
        'utilisateurs as commercant_user',
        'shopkeeper_deliveries.commercant_id',
        'commercant_user.id'
      )
      .select(
        'shopkeeper_deliveries.*',
        'commercant_user.first_name as commercant_first_name',
        'commercant_user.last_name as commercant_last_name'
      )
      .orderBy('shopkeeper_deliveries.created_at', 'desc')

    return response.ok(availableDeliveries)
  }

  /**
   * Permet à un livreur de mettre à jour le statut de la livraison.
   */
  public async updateStatus({ params, request, auth, response }: HttpContext) {
    const livreur = await auth.authenticate()
    const { status } = request.only(['status'])
    const validStatuses = ['in_transit', 'delivered', 'cancelled']

    if (!validStatuses.includes(status)) {
      return response.badRequest({ message: 'Invalid status provided.' })
    }

    const deliveryRequest = await ShopkeeperDelivery.findOrFail(params.id)

    if (deliveryRequest.livreurId !== livreur.id) {
      return response.forbidden({ message: 'You are not assigned to this delivery.' })
    }

    deliveryRequest.status = status as 'in_transit' | 'delivered' | 'cancelled'
    await deliveryRequest.save()

    // TODO: Mettre à jour le statut de la `Livraison` et du `Colis` correspondants

    return response.ok(deliveryRequest)
  }

  /**
   * Récupère les informations de suivi pour un client final.
   */
  public async getTrackingInfo({ params, response }: HttpContext) {
    const { trackingNumber } = params
    const delivery = await db
      .from('shopkeeper_deliveries')
      .where('tracking_number', trackingNumber)
      .leftJoin(
        'utilisateurs as commercant_user',
        'shopkeeper_deliveries.commercant_id',
        'commercant_user.id'
      )
      .leftJoin(
        'utilisateurs as livreur_user',
        'shopkeeper_deliveries.livreur_id',
        'livreur_user.id'
      )
      .select(
        'shopkeeper_deliveries.*',
        'commercant_user.first_name as commercant_first_name',
        'commercant_user.last_name as commercant_last_name',
        'livreur_user.first_name as livreur_first_name',
        'livreur_user.last_name as livreur_last_name'
      )
      .first()

    if (!delivery) {
      return response.notFound({ message: 'Delivery not found.' })
    }

    return response.ok(delivery)
  }

  /**
   * ADMIN - Récupère toutes les livraisons de commerçants pour l'administration.
   */
  public async getAllForAdmin({ response }: HttpContext) {
    try {
      const deliveries = await db
        .from('shopkeeper_deliveries')
        .leftJoin(
          'utilisateurs as commercant_user',
          'shopkeeper_deliveries.commercant_id',
          'commercant_user.id'
        )
        .leftJoin('commercants', 'commercant_user.id', 'commercants.id')
        .leftJoin(
          'utilisateurs as livreur_user',
          'shopkeeper_deliveries.livreur_id',
          'livreur_user.id'
        )
        .select(
          'shopkeeper_deliveries.*',
          'commercant_user.first_name as commercant_first_name',
          'commercant_user.last_name as commercant_last_name',
          'commercant_user.email as commercant_email',
          'commercant_user.phone_number as commercant_phone',
          'livreur_user.first_name as livreur_first_name',
          'livreur_user.last_name as livreur_last_name',
          'livreur_user.email as livreur_email',
          'livreur_user.phone_number as livreur_phone'
        )
        .orderBy('shopkeeper_deliveries.created_at', 'desc')

      console.log(`✅ Récupération de ${deliveries.length} livraisons de commerçants pour l'admin`)
      return response.ok(deliveries)
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des livraisons admin:', error)
      return response.badRequest({
        message: 'Failed to fetch admin deliveries',
        error: error.message,
      })
    }
  }

  /**
   * ADMIN - Supprime une demande de livraison (accès administrateur).
   * Les admins peuvent supprimer n'importe quelle livraison, peu importe son statut.
   */
  public async deleteForAdmin({ params, response }: HttpContext) {
    try {
      const deliveryRequest = await ShopkeeperDelivery.findOrFail(params.id)

      console.log(`🗑️ Admin suppression de la livraison ${deliveryRequest.id}`)

      // Supprimer le colis associé si il existe
      const colis = await Colis.findBy('trackingNumber', deliveryRequest.trackingNumber)
      if (colis) {
        await colis.delete()
        console.log(`✅ Colis ${deliveryRequest.trackingNumber} supprimé`)
      }

      // Supprimer la livraison associée si elle existe
      if (deliveryRequest.livreurId) {
        const livraison = await Livraison.query()
          .where('dropoffLocation', deliveryRequest.customerAddress)
          .where('livreurId', deliveryRequest.livreurId)
          .first()
        if (livraison) {
          await livraison.delete()
          console.log(`✅ Livraison associée supprimée`)
        }
      }

      // Supprimer les codes temporaires associés
      await CodeTemporaire.query().where('user_info', deliveryRequest.trackingNumber).delete()

      // Supprimer la demande de livraison
      await deliveryRequest.delete()
      console.log(`✅ Demande de livraison ${deliveryRequest.id} supprimée par admin`)

      // Notifier les livreurs via WebSocket que la demande n'est plus disponible
      if (Ws.io) {
        Ws.io.emit('shopkeeper_delivery_deleted', { deliveryId: deliveryRequest.id })
        console.log('📡 Notification WebSocket de suppression envoyée')
      }

      return response.ok({
        message: 'Delivery request successfully deleted by admin.',
        deletedId: deliveryRequest.id,
      })
    } catch (error) {
      console.error('❌ Error deleting shopkeeper delivery (admin):', error)
      return response.badRequest({
        message: 'Failed to delete delivery request',
        error: error.message,
      })
    }
  }

  /**
   * Supprime une demande de livraison créée par le commerçant.
   * Seules les livraisons en attente d'acceptation peuvent être supprimées.
   */
  public async delete({ params, auth, response }: HttpContext) {
    try {
      const commercant = await auth.authenticate()
      const deliveryRequest = await ShopkeeperDelivery.findOrFail(params.id)

      // Vérifier que le commerçant est bien le propriétaire de la demande
      if (deliveryRequest.commercantId !== commercant.id) {
        return response.forbidden({
          message: 'You can only delete your own delivery requests.',
        })
      }

      // Vérifier que la livraison n'a pas encore été acceptée
      if (deliveryRequest.status !== 'pending_acceptance') {
        return response.badRequest({
          message: 'Only pending delivery requests can be deleted.',
        })
      }

      // Supprimer le colis associé si il existe
      const colis = await Colis.findBy('trackingNumber', deliveryRequest.trackingNumber)
      if (colis) {
        await colis.delete()
        console.log(`✅ Colis ${deliveryRequest.trackingNumber} supprimé`)
      }

      // Supprimer la demande de livraison
      await deliveryRequest.delete()
      console.log(`✅ Demande de livraison ${deliveryRequest.id} supprimée`)

      // Notifier les livreurs via WebSocket que la demande n'est plus disponible
      if (Ws.io) {
        Ws.io.emit('shopkeeper_delivery_deleted', { deliveryId: deliveryRequest.id })
        console.log('📡 Notification WebSocket de suppression envoyée')
      }

      return response.ok({
        message: 'Delivery request successfully deleted.',
        deletedId: deliveryRequest.id,
      })
    } catch (error) {
      console.error('❌ Error deleting shopkeeper delivery:', error)
      return response.badRequest({
        message: 'Failed to delete delivery request',
        error: error.message,
      })
    }
  }
}
