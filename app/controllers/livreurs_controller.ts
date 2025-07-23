import type { HttpContext } from '@adonisjs/core/http'
import Livreur from '#models/livreur'
import Utilisateurs from '#models/utilisateurs'
import Livraison from '#models/livraison'
import HistoriqueLivraison from '#models/historique_livraison'
import CodeTemporaire from '#models/code_temporaire'
import { livreurValidator } from '#validators/add_livreur'
import ColisLocationHistory from '#models/colis_location_history'
import { DateTime } from 'luxon'

export default class LivreursController {
  async add({ request, response }: HttpContext) {
    try {
      const { utilisateur_id: utilisateurId } = await request.validateUsing(livreurValidator)

      const livreurAlreadyLinked = await Livreur.findBy('id', utilisateurId)
      if (livreurAlreadyLinked) {
        return response.badRequest({ message: 'Utilisateurs already has a Livreur account' })
      }

      const livreur = await Livreur.create({
        id: utilisateurId,
      })

      return response.created({
        message: 'Livreur created successfully',
        livreur: livreur.serialize(),
      })
    } catch (error) {
      return response.badRequest({ message: 'Invalid data', error_code: error })
    }
  }

  async getProfile({ request, response }: HttpContext) {
    try {
      const client = await Livreur.findOrFail(request.param('id'))
      const user = await Utilisateurs.findOrFail(request.param('id'))
      const userData = user.serialize()
      const { id, ...clientData } = client.serialize()
      return response.ok({ user: userData, client: clientData })
    } catch (error) {
      return response.notFound({ message: 'Client Profile not found', error_code: error })
    }
  }

  async updateProfile({ request, response }: HttpContext) {
    try {
      const livreur = await Livreur.findOrFail(request.param('id'))
      livreur.merge(request.body())
      await livreur.save()
      const { password, ...livreurData } = livreur.serialize()
      return response.ok(livreurData)
    } catch (error) {
      return response.badRequest({ message: 'Wrong Parametters', error_code: error })
    }
  }

  /**
   * Récupérer toutes les livraisons d'un livreur
   */
  async getLivraisons({ auth, request, response }: HttpContext) {
    try {
      const livreurId = request.param('id')
      const status = request.input('status')
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)

      // Vérifier que le livreur existe
      await Livreur.findOrFail(livreurId)

      let query = Livraison.query()
        .where('livreur_id', livreurId)
        .preload('annonce', (annonceQuery) => {
          annonceQuery.preload('utilisateur' as any)
        })
        .preload('client', (clientQuery) => {
          clientQuery.preload('user' as any)
        })
        .preload('colis', (colisQuery) => {
          colisQuery.preload('annonce', (annonceQuery) => {
            annonceQuery.preload('utilisateur' as any)
          })
        })
        .preload('historique')

      // Filtrer par statut si fourni
      if (status) {
        query = query.where('status', status)
      }

      const livraisons = await query.orderBy('created_at', 'desc').paginate(page, limit)

      return response.ok({
        livraisons: livraisons.serialize(),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des livraisons',
        error_code: error,
      })
    }
  }

  /**
   * Récupérer les livraisons disponibles (non assignées)
   */
  async getAvailableLivraisons({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)

      const livraisons = await Livraison.query()
        .whereNull('livreur_id')
        .where('status', 'scheduled')
        .preload('colis', (colisQuery) => {
          colisQuery.preload('annonce', (annonceQuery) => {
            annonceQuery.preload('utilisateur' as any)
          })
        })
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      return response.ok({
        livraisons: livraisons.serialize(),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des livraisons disponibles',
        error_code: error,
      })
    }
  }

  /**
   * Accepter une livraison
   */
  async acceptLivraison({ auth, request, response }: HttpContext) {
    try {
      const livreurId = request.param('id')
      const livraisonId = request.param('livraisonId')

      // Vérifier que le livreur existe
      const livreur = await Livreur.findOrFail(livreurId)
      await livreur.load('user')

      // Vérifier que la livraison existe et n'est pas déjà assignée
      const livraison = await Livraison.findOrFail(livraisonId)

      if (livraison.livreurId) {
        return response.conflict({
          message: 'Cette livraison est déjà assignée à un autre livreur',
        })
      }

      // Assigner la livraison au livreur
      livraison.livreurId = livreur.id
      livraison.status = 'in_progress'
      await livraison.save()

      // Créer des entrées d'historique détaillées
      // 1. Prise en charge de la livraison
      await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: 'accepted',
        remarks: `Livraison prise en charge par ${livreur.user?.last_name || 'le livreur'} ${livreur.user?.first_name || ''} (ID: ${livreurId})`,
      })

      // 2. Début de la livraison
      await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: 'in_progress',
        remarks: `Début de la livraison - Le livreur se dirige vers le point de collecte`,
      })

      await livraison.load('colis')
      
      // Ajouter des entrées dans colis_location_histories pour la prise en charge
      for (const coli of livraison.colis) {
        // Entrée pour la prise en charge
        await ColisLocationHistory.create({
          colisId: coli.id,
          locationType: 'livreur_location',
          locationId: livreur.id,
          address: livreur.user?.address || 'Adresse du livreur non renseignée',
          description: `Livraison prise en charge par ${livreur.user?.last_name || 'le livreur'} ${livreur.user?.first_name || ''} (ID: ${livreurId})`,
          movedAt: DateTime.now(),
        })
        
        // Entrée pour le début de la livraison
        await ColisLocationHistory.create({
          colisId: coli.id,
          locationType: 'pickup_location',
          locationId: null,
          address: livraison.pickupLocation,
          description: 'Début de la livraison - Le livreur se dirige vers le point de collecte',
          movedAt: DateTime.now(),
        })
      }
      
      await livraison.load('historique')

      return response.ok({
        message: 'Livraison acceptée avec succès',
        livraison: livraison.serialize(),
      })
    } catch (error) {
      return response.badRequest({
        message: "Erreur lors de l'acceptation de la livraison",
        error_code: error,
      })
    }
  }

  /**
   * Signaler la récupération du colis
   */
  async confirmPickup({ auth, request, response }: HttpContext) {
    console.log('🔄 [Backend confirmPickup] Début de la confirmation de récupération')

    try {
      const livreurId = request.param('id')
      const livraisonId = request.param('livraisonId')
      const { remarks } = request.body()

      console.log('📋 [Backend confirmPickup] Paramètres reçus:', {
        livreurId,
        livraisonId,
        remarks,
      })

      // Vérifier que le livreur existe
      console.log("🔍 [Backend confirmPickup] Vérification de l'existence du livreur...")
      await Livreur.findOrFail(livreurId)
      console.log('✅ [Backend confirmPickup] Livreur trouvé:', livreurId)

      // Vérifier que la livraison existe et appartient au livreur
      console.log('🔍 [Backend confirmPickup] Vérification de la livraison...')
      const livraison = await Livraison.findOrFail(livraisonId)

      if (livraison.livreurId !== Number(livreurId)) {
        console.log('❌ [Backend confirmPickup] Livraison non assignée à ce livreur')
        return response.forbidden({
          message: "Vous n'êtes pas autorisé à modifier cette livraison",
        })
      }
      console.log('✅ [Backend confirmPickup] Livraison trouvée:', livraison.id)

      // Ajouter une entrée d'historique pour la récupération
      console.log("📝 [Backend confirmPickup] Création de l'entrée d'historique...")
      const historiqueEntry = await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: 'picked_up',
        remarks: remarks || 'Colis récupéré avec succès - En route vers la destination',
      })
      console.log("✅ [Backend confirmPickup] Entrée d'historique créée:", historiqueEntry.id)

      await livraison.load('colis')
      
      // Ajouter des entrées dans colis_location_histories pour la récupération
      console.log("📝 [Backend confirmPickup] Création des entrées de localisation...")
      for (const coli of livraison.colis) {
        await ColisLocationHistory.create({
          colisId: coli.id,
          locationType: 'in_transit',
          locationId: livreur.id,
          address: livraison.pickupLocation,
          description: remarks || 'Colis récupéré avec succès - En route vers la destination',
          movedAt: DateTime.now(),
        })
      }
      console.log("✅ [Backend confirmPickup] Entrées de localisation créées")
      
      await livraison.load('historique')

      console.log('🏁 [Backend confirmPickup] Confirmation de récupération terminée avec succès')
      return response.ok({
        message: 'Récupération du colis confirmée',
        livraison: livraison.serialize(),
      })
    } catch (error) {
      console.log('❌ [Backend confirmPickup] Erreur:', error)
      return response.badRequest({
        message: 'Erreur lors de la confirmation de récupération',
        error_code: error,
      })
    }
  }

  /**
   * Signaler que le livreur est en route vers la destination
   */
  async confirmEnRoute({ auth, request, response }: HttpContext) {
    console.log('🚗 [Backend confirmEnRoute] Début de la confirmation en route')

    try {
      const livreurId = request.param('id')
      const livraisonId = request.param('livraisonId')
      const { remarks } = request.body()

      console.log('📋 [Backend confirmEnRoute] Paramètres reçus:', {
        livreurId,
        livraisonId,
        remarks,
      })

      // Vérifier que le livreur existe
      console.log("🔍 [Backend confirmEnRoute] Vérification de l'existence du livreur...")
      await Livreur.findOrFail(livreurId)
      console.log('✅ [Backend confirmEnRoute] Livreur trouvé:', livreurId)

      // Vérifier que la livraison existe et appartient au livreur
      console.log('🔍 [Backend confirmEnRoute] Vérification de la livraison...')
      const livraison = await Livraison.findOrFail(livraisonId)

      if (livraison.livreurId !== Number(livreurId)) {
        console.log('❌ [Backend confirmEnRoute] Livraison non assignée à ce livreur')
        return response.forbidden({
          message: "Vous n'êtes pas autorisé à modifier cette livraison",
        })
      }
      console.log('✅ [Backend confirmEnRoute] Livraison trouvée:', livraison.id)

      // Ajouter une entrée d'historique pour le départ vers la destination
      console.log("📝 [Backend confirmEnRoute] Création de l'entrée d'historique...")
      const historiqueEntry = await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: 'en_route_to_destination',
        remarks: remarks || "Le livreur est en route vers l'adresse de livraison",
      })
      console.log("✅ [Backend confirmEnRoute] Entrée d'historique créée:", historiqueEntry.id)

      await livraison.load('colis')
      
      // Ajouter une entrée dans colis_location_histories pour le départ vers la destination
      console.log("📝 [Backend confirmEnRoute] Création de l'entrée de localisation...")
      const livreur = await Livreur.findOrFail(livreurId)
      for (const coli of livraison.colis) {
        await ColisLocationHistory.create({
          colisId: coli.id,
          locationType: 'in_transit',
          locationId: livreur.id,
          address: livraison.dropoffLocation,
          description: remarks || "Le livreur est en route vers l'adresse de livraison",
          movedAt: DateTime.now(),
        })
      }
      console.log("✅ [Backend confirmEnRoute] Entrées de localisation créées")
      
      await livraison.load('historique')

      console.log('🏁 [Backend confirmEnRoute] Confirmation en route terminée avec succès')
      return response.ok({
        message: 'Statut "en route" confirmé',
        livraison: livraison.serialize(),
      })
    } catch (error) {
      console.log('❌ [Backend confirmEnRoute] Erreur:', error)
      return response.badRequest({
        message: 'Erreur lors de la confirmation du statut "en route"',
        error_code: error,
      })
    }
  }

  /**
   * Mettre à jour le statut d'une livraison
   */
  async updateLivraisonStatus({ auth, request, response }: HttpContext) {
    try {
      const livreurId = request.param('id')
      const livraisonId = request.param('livraisonId')
      const { status, remarks } = request.body()

      // Vérifier que le livreur existe
      await Livreur.findOrFail(livreurId)

      // Vérifier que la livraison existe et appartient au livreur
      const livraison = await Livraison.findOrFail(livraisonId)

      if (livraison.livreurId !== Number(livreurId)) {
        return response.forbidden({
          message: "Vous n'êtes pas autorisé à modifier cette livraison",
        })
      }

      // Valider le statut
      const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return response.badRequest({
          message: 'Statut invalide',
        })
      }

      // Mettre à jour le statut
      const oldStatus = livraison.status
      livraison.status = status
      await livraison.save()

      // Créer des entrées d'historique détaillées selon le statut
      let historyRemarks = remarks

      if (!historyRemarks) {
        switch (status) {
          case 'in_progress':
            if (oldStatus === 'scheduled') {
              historyRemarks = 'Livraison en cours - Le livreur a récupéré le colis'
            } else {
              historyRemarks = 'Livraison en cours de traitement'
            }
            break
          case 'completed':
            historyRemarks = 'Livraison terminée avec succès - Colis livré au destinataire'
            break
          case 'cancelled':
            historyRemarks = 'Livraison annulée'
            break
          case 'scheduled':
            historyRemarks = 'Livraison reprogrammée'
            break
          default:
            historyRemarks = `Statut changé de ${oldStatus} à ${status}`
        }
      }

      await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: status,
        remarks: historyRemarks,
      })

      // Gestion spécifique selon le statut
      if (status === 'completed') {
        // Ajouter une entrée d'historique pour l'arrivée chez le destinataire
        await HistoriqueLivraison.create({
          livraisonId: livraison.id,
          status: 'arrived_at_destination',
          remarks: "Le livreur est arrivé à l'adresse de livraison",
        })

        await livraison.load('colis')
        await livraison.load('client')
        
        for (const coli of livraison.colis) {
          coli.status = 'delivered'
          coli.locationType = 'client_address'
          await coli.save()
          
          // Ajouter une entrée dans colis_location_histories pour l'arrivée
          await ColisLocationHistory.create({
            colisId: coli.id,
            locationType: 'client_address',
            locationId: livraison.clientId,
            address: livraison.dropoffLocation,
            description: "Le livreur est arrivé à l'adresse de livraison",
            movedAt: DateTime.now(),
          })
        }

        // Mettre à jour le statut de l'annonce si elle existe
        if (livraison.annonceId) {
          await livraison.load('annonce')
          if (livraison.annonce) {
            livraison.annonce.status = 'completed'
            await livraison.annonce.save()
          }
        }

        // Générer et envoyer le code de validation par email au client
        await livraison.load('client')
        if (livraison.client) {
          await livraison.client.load('user')
          const clientEmail = livraison.client.user.email

          // Supprimer l'ancien code s'il existe
          await CodeTemporaire.query().where('user_info', livraison.id.toString()).delete()

          // Générer un nouveau code
          const code = Math.floor(100000 + Math.random() * 900000).toString()

          // Sauvegarder le code en base
          await CodeTemporaire.create({
            user_info: livraison.id.toString(),
            code: code,
          })

          // Ajouter une entrée d'historique pour la génération du code
          await HistoriqueLivraison.create({
            livraisonId: livraison.id,
            status: 'validation_code_sent',
            remarks: `Code de validation généré et envoyé au client (${clientEmail})`,
          })
          
          // Ajouter une entrée dans colis_location_histories pour l'envoi du code
          for (const coli of livraison.colis) {
            await ColisLocationHistory.create({
              colisId: coli.id,
              locationType: 'client_address',
              locationId: livraison.clientId,
              address: livraison.dropoffLocation,
              description: `Code de validation généré et envoyé au client (${clientEmail})`,
              movedAt: DateTime.now(),
            })
          }

          console.log(`Code de validation généré pour la livraison ${livraison.id}: ${code}`)
        }
      } else if (status === 'cancelled') {
        // Ajouter des détails spécifiques pour l'annulation
        const cancellationReason = remarks || 'Raison non spécifiée'
        await HistoriqueLivraison.create({
          livraisonId: livraison.id,
          status: 'cancellation_details',
          remarks: `Détails de l'annulation: ${cancellationReason}`,
        })
        
        // Ajouter une entrée dans colis_location_histories pour l'annulation
        await livraison.load('colis')
        for (const coli of livraison.colis) {
          await ColisLocationHistory.create({
            colisId: coli.id,
            locationType: 'cancelled',
            locationId: Number(livreurId),
            address: livraison.pickupLocation || livraison.dropoffLocation,
            description: `Livraison annulée: ${cancellationReason}`,
            movedAt: DateTime.now(),
          })
        }
      }

      await livraison.load('colis')
      await livraison.load('historique')

      return response.ok({
        message: 'Statut de la livraison mis à jour',
        livraison: livraison.serialize(),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la mise à jour du statut',
        error_code: error,
      })
    }
  }

  /**
   * Obtenir les statistiques du livreur
   */
  async getStats({ request, response }: HttpContext) {
    try {
      const livreurId = request.param('id')

      // Vérifier que le livreur existe
      const livreur = await Livreur.findOrFail(livreurId)

      // Compter les livraisons par statut
      const livraisonsCount = await Livraison.query()
        .where('livreur_id', livreurId)
        .count('* as total')

      const completedCount = await Livraison.query()
        .where('livreur_id', livreurId)
        .where('status', 'completed')
        .count('* as total')

      const inProgressCount = await Livraison.query()
        .where('livreur_id', livreurId)
        .where('status', 'in_progress')
        .count('* as total')

      const cancelledCount = await Livraison.query()
        .where('livreur_id', livreurId)
        .where('status', 'cancelled')
        .count('* as total')

      // Calculer les revenus (si applicable)
      const totalRevenue = await Livraison.query()
        .where('livreur_id', livreurId)
        .where('status', 'completed')
        .count('* as total') // À adapter selon votre logique de calcul des revenus

      return response.ok({
        stats: {
          totalLivraisons: Number(livraisonsCount[0].$extras.total),
          completedLivraisons: Number(completedCount[0].$extras.total),
          inProgressLivraisons: Number(inProgressCount[0].$extras.total),
          cancelledLivraisons: Number(cancelledCount[0].$extras.total),
        },
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des statistiques',
        error_code: error,
      })
    }
  }
}
