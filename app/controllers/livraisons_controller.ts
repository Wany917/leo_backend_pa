import type { HttpContext } from '@adonisjs/core/http'
import Livraison from '#models/livraison'
import Annonce from '#models/annonce'
import Client from '#models/client'
import { livraisonValidator, updateLivraisonValidator } from '#validators/create_livraison'
import db from '@adonisjs/lucid/services/db'

export default class LivraisonsController {
  // ========== Récupérer toutes les livraisons (admins seulement) ==========
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 50)
      const status = request.input('status')

      let query = Livraison.query().preload('livreur').preload('client').preload('colis')

      // Filtrage par statut si fourni
      if (status) {
        query = query.where('status', status)
      }

      const livraisons = await query.orderBy('created_at', 'desc').paginate(page, limit)

      return response.ok({
        livraisons: livraisons.serialize(),
        total: livraisons.total,
        page: livraisons.currentPage,
        perPage: livraisons.perPage,
      })
    } catch (error) {
      console.error('Error fetching all deliveries:', error)
      return response.status(500).json({
        error: 'Une erreur est survenue lors de la récupération des livraisons',
        details: error.message,
      })
    }
  }

  async create({ request, response, auth }: HttpContext) {
    const trx = await db.transaction()

    try {
      const data = await request.validateUsing(livraisonValidator)

      const annonce = await Annonce.findOrFail(request.param('id'))

      // Récupérer le client depuis l'utilisateur de l'annonce
      const client = await Client.query().where('id', annonce.utilisateurId).first()

      const clientId = client?.id || null

      const livraison = await Livraison.create(
        {
          livreurId: data.livreur_id ?? null,
          pickupLocation: data.pickup_location,
          dropoffLocation: data.dropoff_location,
          clientId: clientId,
          annonceId: annonce.id,
          price: annonce.price,
          status: 'scheduled',
        },
        { client: trx }
      )

      // Charger les colis liés à l'annonce
      await annonce.load('colis' as any)

      // Associer les colis à la livraison
      const colisIds = annonce.colis.map((colis) => colis.id)
      await livraison.related('colis').attach(colisIds, trx)

      await livraison.load('colis' as any)

      // 🆕 Mettre à jour le statut de l'annonce pour qu'elle ne soit plus listée comme « active »
      annonce.status = 'pending'
      annonce.useTransaction(trx)
      await annonce.save()

      await trx.commit()

      // Notifier les livreurs disponibles via WebSocket
      await livraison.notifyNewDelivery()

      return response.created({
        message: 'Livraison créée avec succès',
        data: livraison,
      })
    } catch (error) {
      await trx.rollback()
      console.error('Erreur création livraison:', error)
      return response.badRequest({
        message: 'Erreur lors de la création de la livraison',
        error: error.message,
      })
    }
  }

  async show({ request, response }: HttpContext) {
    const id = Number.parseInt(request.param('id'))
    if (Number.isNaN(id)) {
      return response.badRequest({ error: 'ID de livraison invalide' })
    }

    const livraison = await Livraison.query()
      .where('id', id)
      .preload('livreur')
      .preload('colis')
      .firstOrFail()
    return response.ok({ livraison: livraison.serialize() })
  }

  async update({ request, response }: HttpContext) {
    const id = Number.parseInt(request.param('id'))
    if (Number.isNaN(id)) {
      return response.badRequest({ error: 'ID de livraison invalide' })
    }

    const payload = await request.validateUsing(updateLivraisonValidator)
    const livraison = await Livraison.findOrFail(id)

    livraison.merge({
      livreurId: payload.livreur_id ?? livraison.livreurId,
      pickupLocation: payload.pickup_location ?? livraison.pickupLocation,
      dropoffLocation: payload.dropoff_location ?? livraison.dropoffLocation,
      status: payload.status ?? livraison.status,
    })
    await livraison.save()
    await livraison.load('colis')
    await livraison.load('historique')
    return response.ok({ livraison: livraison.serialize() })
  }

  // ========== Récupérer les livraisons d'un client ==========
  async getClientLivraisons({ params, response }: HttpContext) {
    try {
      const clientId = params.client_id
      console.log('🔍 getClientLivraisons called with clientId:', clientId)
      console.log('🔍 clientId type:', typeof clientId)

      const livraisons = await Livraison.query()
        .where('client_id', clientId)
        .preload('livreur')
        .preload('client')
        .preload('colis', (coliQuery) => {
          coliQuery.preload('annonce')
        })
        .orderBy('created_at', 'desc')

      console.log('🔍 Query result count:', livraisons.length)
      console.log(
        '🔍 Found livraisons:',
        livraisons.map((l) => ({
          id: l.id,
          clientId: l.clientId,
          client_id: l.clientId,
          status: l.status,
        }))
      )

      // Vérifier s'il y a des livraisons en base avec d'autres client_id
      const allLivraisons = await Livraison.query()
        .select('id', 'client_id')
        .orderBy('id', 'desc')
        .limit(10)
      console.log(
        '🔍 All recent livraisons in DB (sample):',
        allLivraisons.map((l) => ({ id: l.id, client_id: l.clientId }))
      )

      // 🚀 ENRICHIR LES LIVRAISONS AVEC LES DONNÉES DE PAIEMENT
      const enrichedLivraisons = livraisons.map((livraison) => {
        const serialized = livraison.serialize()

        console.log('💰 Processing livraison payment data:', {
          id: livraison.id,
          paymentStatus: livraison.paymentStatus,
          paymentIntentId: livraison.paymentIntentId,
          amount: livraison.amount,
        })

        // Utiliser les champs de paiement du modèle
        return {
          ...serialized,
          payment_status: livraison.paymentStatus || 'unpaid',
          payment_intent_id: livraison.paymentIntentId || null,
          amount: livraison.amount || null,
        }
      })

      console.log('✅ Enriched livraisons count:', enrichedLivraisons.length)

      return response.ok({
        success: true,
        livraisons: {
          data: enrichedLivraisons,
          meta: {
            total: livraisons.length,
          },
        },
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des livraisons du client:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur lors de la récupération des livraisons',
      })
    }
  }

  // ========== NOUVEAU: Récupérer les livraisons d'une annonce ==========
  async getAnnounceLivraisons({ request, response }: HttpContext) {
    try {
      const annonceId = Number.parseInt(request.param('id'))
      if (Number.isNaN(annonceId)) {
        return response.badRequest({ error: 'ID annonce invalide' })
      }

      // Vérifier que l'annonce existe
      const annonce = await Annonce.findOrFail(annonceId)

      // Récupérer les livraisons via les colis de l'annonce
      const livraisons = await db
        .from('livraisons')
        .join('livraison_colis', 'livraisons.id', '=', 'livraison_colis.livraison_id')
        .join('colis', 'livraison_colis.colis_id', '=', 'colis.id')
        .where('colis.annonce_id', annonceId)
        .select('livraisons.*')
        .distinct()
        .orderBy('livraisons.created_at', 'desc')

      // Enrichir avec les relations
      const enrichedLivraisons = await Promise.all(
        livraisons.map(async (livraison) => {
          const fullLivraison = await Livraison.query()
            .where('id', livraison.id)
            .preload('livreur')
            .preload('client')
            .preload('colis')
            .first()

          return fullLivraison?.serialize()
        })
      )

      return response.ok({
        livraisons: enrichedLivraisons.filter(Boolean),
        annonce: annonce.serialize(),
      })
    } catch (error) {
      console.error('Error fetching announcement deliveries:', error)
      return response.status(500).json({
        error: "Une erreur est survenue lors de la récupération des livraisons de l'annonce",
        details: error.message,
      })
    }
  }

  async cancel({ request, auth, response }: HttpContext) {
    try {
      const livraisonId = Number(request.param('id'))
      if (Number.isNaN(livraisonId)) {
        return response.badRequest({ error: 'ID de livraison invalide' })
      }

      // Authentifier l’utilisateur
      const user = await auth.authenticate()

      // Récupérer la livraison + annonce liée
      const livraison = await Livraison.findOrFail(livraisonId)
      await livraison.load('annonce')

      // Vérifier que l’utilisateur est bien le livreur assigné
      if (livraison.livreurId !== user.id) {
        return response.unauthorized({
          error: 'Vous n’êtes pas autorisé à annuler cette livraison',
        })
      }

      // Ne pas annuler si déjà terminée ou annulée
      if (['completed', 'cancelled'].includes(livraison.status)) {
        return response.badRequest({ error: 'Cette livraison ne peut plus être annulée' })
      }

      const trx = await db.transaction()
      try {
        // 1. Annuler la livraison
        livraison.status = 'cancelled'
        livraison.useTransaction(trx)
        await livraison.save()

        // 2. Réactiver l’annonce associée (si existe)
        if (livraison.annonce) {
          const annonce = livraison.annonce
          annonce.status = 'active'
          annonce.useTransaction(trx)
          await annonce.save()
        }

        await trx.commit()
      } catch (err) {
        await trx.rollback()
        throw err
      }

      return response.ok({ success: true, message: 'Livraison annulée avec succès' })
    } catch (error) {
      console.error('Erreur annulation livraison:', error)
      return response.internalServerError({ success: false, message: error.message })
    }
  }
}
