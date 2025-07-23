import type { HttpContext } from '@adonisjs/core/http'
import Livreur from '#models/livreur'
import Utilisateurs from '#models/utilisateurs'
import Livraison from '#models/livraison'
import HistoriqueLivraison from '#models/historique_livraison'
import CodeTemporaire from '#models/code_temporaire'
import { livreurValidator } from '#validators/add_livreur'
import { Resend } from 'resend'
// import { DateTime } from 'luxon'

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

      // Créer un historique
      await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: 'in_progress',
        remarks: `Livraison acceptée par le livreur ${livreurId}`,
      })

      await livraison.load('colis')
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

      // Créer un historique
      await HistoriqueLivraison.create({
        livraisonId: livraison.id,
        status: status,
        remarks: remarks || `Statut changé de ${oldStatus} à ${status}`,
      })

      // Si la livraison est terminée, mettre à jour les colis et l'annonce
      if (status === 'completed') {
        await livraison.load('colis')
        for (const coli of livraison.colis) {
          coli.status = 'delivered'
          coli.locationType = 'client_address'
          await coli.save()
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
            code: code
          })
          
          // Envoyer l'email avec le code
          try {
            const resend = new Resend(process.env.RESEND_API_KEY!)
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "noreplyecodeli@gmail.com",
              to: clientEmail,
              subject: "Code de validation de livraison - EcoDeli",
              html: `
                <h2>Votre livraison a été effectuée !</h2>
                <p>Bonjour,</p>
                <p>Votre livraison #${livraison.id} a été marquée comme effectuée par le livreur.</p>
                <p>Voici votre code de validation :</p>
                <h3 style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 3px;">${code}</h3>
                <p>Utilisez ce code pour confirmer la réception de votre livraison.</p>
                <p>Merci d'avoir utilisé EcoDeli !</p>
              `
            })
            console.log(`Code de validation envoyé à ${clientEmail} pour la livraison ${livraison.id}`)
          } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email:', emailError)
            // Ne pas faire échouer la mise à jour du statut si l'email échoue
          }
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
