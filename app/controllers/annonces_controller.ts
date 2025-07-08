import type { HttpContext } from '@adonisjs/core/http'
import Annonce from '#models/annonce'
import { annonceValidator } from '#validators/create_annonce'
import { updateAnnonceValidator } from '#validators/update_annonce'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'

export default class AnnoncesController {
  /**
   * @tag Annonces - CRUD
   * @summary Lister toutes les annonces
   * @description Récupère toutes les annonces avec utilisateurs et relations
   */
  async getAllAnnonces({ request, response }: HttpContext) {
    const annonces = await Annonce.query().preload('utilisateur' as ExtractModelRelations<Annonce>)
    return response.ok({ annonces: annonces.map((annonce) => annonce.serialize()) })
  }

  /**
   * @tag Annonces - Admin
   * @summary Lister toutes les annonces pour le back-office
   * @description Récupère toutes les annonces avec filtres de recherche, pagination et informations utilisateur
   */
  async getAdminAnnonces({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const search = request.input('search', '')
      const type = request.input('type', '')
      const status = request.input('status', '')
      const userType = request.input('user_type', '') // 'livreur', 'commercant', ou ''

      // Construction de la requête avec joins
      let query = db
        .from('annonces')
        .select(
          'annonces.*',
          'utilisateurs.first_name',
          'utilisateurs.last_name',
          'utilisateurs.email',
          'utilisateurs.city',
          'livreurs.id as is_livreur',
          'commercants.id as is_commercant'
        )
        .join('utilisateurs', 'annonces.utilisateur_id', 'utilisateurs.id')
        .leftJoin('livreurs', 'utilisateurs.id', 'livreurs.id')
        .leftJoin('commercants', 'utilisateurs.id', 'commercants.id')
        .orderBy('annonces.created_at', 'desc')

      // Filtrage par recherche (titre, description, nom d'utilisateur)
      if (search) {
        query = query.where((builder) => {
          builder
            .whereILike('annonces.title', `%${search}%`)
            .orWhereILike('annonces.description', `%${search}%`)
            .orWhereILike('utilisateurs.first_name', `%${search}%`)
            .orWhereILike('utilisateurs.last_name', `%${search}%`)
            .orWhereILike('utilisateurs.email', `%${search}%`)
        })
      }

      // Filtrage par type d'annonce
      if (type) {
        query = query.where('annonces.type', type)
      }

      // Filtrage par statut
      if (status) {
        query = query.where('annonces.status', status)
      }

      // Filtrage par type d'utilisateur
      if (userType === 'livreur') {
        query = query.whereNotNull('livreurs.id')
      } else if (userType === 'commercant') {
        query = query.whereNotNull('commercants.id')
      }

      // Pagination
      const offset = (page - 1) * limit
      const annonces = await query.limit(limit).offset(offset)

      // Compter le total pour la pagination
      let countQuery = db
        .from('annonces')
        .join('utilisateurs', 'annonces.utilisateur_id', 'utilisateurs.id')
        .leftJoin('livreurs', 'utilisateurs.id', 'livreurs.id')
        .leftJoin('commercants', 'utilisateurs.id', 'commercants.id')

      // Appliquer les mêmes filtres pour le count
      if (search) {
        countQuery = countQuery.where((builder) => {
          builder
            .whereILike('annonces.title', `%${search}%`)
            .orWhereILike('annonces.description', `%${search}%`)
            .orWhereILike('utilisateurs.first_name', `%${search}%`)
            .orWhereILike('utilisateurs.last_name', `%${search}%`)
            .orWhereILike('utilisateurs.email', `%${search}%`)
        })
      }

      if (type) {
        countQuery = countQuery.where('annonces.type', type)
      }

      if (status) {
        countQuery = countQuery.where('annonces.status', status)
      }

      if (userType === 'livreur') {
        countQuery = countQuery.whereNotNull('livreurs.id')
      } else if (userType === 'commercant') {
        countQuery = countQuery.whereNotNull('commercants.id')
      }

      const total = await countQuery.count('* as count').first()

      // Formatter les données pour le frontend
      const formattedAnnonces = annonces.map((annonce) => ({
        id: annonce.id,
        title: annonce.title,
        description: annonce.description,
        price: annonce.price,
        type: annonce.type,
        status: annonce.status,
        priority: annonce.priority,
        startLocation: annonce.start_location,
        endLocation: annonce.end_location,
        desiredDate: annonce.desired_date,
        actualDeliveryDate: annonce.actual_delivery_date,
        insuranceAmount: annonce.insurance_amount,
        createdAt: annonce.created_at,
        updatedAt: annonce.updated_at,
        user: {
          id: annonce.utilisateur_id,
          firstName: annonce.first_name,
          lastName: annonce.last_name,
          email: annonce.email,
          city: annonce.city,
          type: annonce.is_livreur ? 'livreur' : annonce.is_commercant ? 'commercant' : 'client',
        },
      }))

      return response.ok({
        annonces: formattedAnnonces,
        pagination: {
          page: page,
          limit: limit,
          total: total?.count || 0,
          totalPages: Math.ceil((total?.count || 0) / limit),
        },
        filters: {
          search,
          type,
          status,
          userType,
        },
      })
    } catch (error) {
      console.error('Error fetching admin annonces:', error)
      return response.status(500).send({
        error: error.message,
        detail: error.detail || 'Une erreur est survenue lors de la récupération des annonces',
      })
    }
  }

  /**
   * @tag Annonces - CRUD
   * @summary Créer une nouvelle annonce
   * @description Crée une annonce avec upload d'image optionnel
   */
  async create({ request, response }: HttpContext) {
    try {
      // Récupérer le dernier ID de la table annonces
      const result = await db.from('annonces').max('id as maxId').first()
      const maxId = result?.maxId || 0
      const nextId = Number(maxId) + 1

      const {
        utilisateur_id: utilisateurId,
        title,
        description,
        tags,
        price,
        type,
        status,
        desired_date: desiredDate,
        actual_delivery_date: actualDeliveryDate,
        end_location: endLocation,
        start_location: startLocation,
        priority,
        storage_box_id: storageBoxId,
        insurance_amount: insuranceAmount,
      } = await request.validateUsing(annonceValidator)

      const annonce = await Annonce.create({
        id: nextId, // Définir explicitement le prochain ID
        utilisateurId: utilisateurId,
        title,
        description: description ?? null,
        price: price,
        tags: tags ?? [],
        type: type ?? 'transport_colis', // Valeur par défaut
        status: status ?? 'active', // Nouveau: remplace state: 'open'
        desiredDate: desiredDate ? DateTime.fromJSDate(new Date(desiredDate)) : null,
        actualDeliveryDate: actualDeliveryDate
          ? DateTime.fromJSDate(new Date(actualDeliveryDate))
          : null,
        endLocation: endLocation ?? null, // Nouveau: remplace destinationAddress
        startLocation: startLocation ?? null, // Nouveau: remplace startingAddress
        imagePath: null,
        priority: priority ?? false,
        storageBoxId: storageBoxId ?? null,
        insuranceAmount: insuranceAmount ?? 0, // Nouveau champ
      })

      // Gérer l'upload d'image si présent
      const image = request.file('image')
      if (image) {
        const fileName = `${Date.now()}_${image.clientName}`
        try {
          await image.move(app.tmpPath('uploads/annonces'), {
            name: fileName,
          })

          if (image.state === 'moved') {
            annonce.imagePath = `uploads/annonces/${fileName}`
            await annonce.save()
          }
        } catch (error) {
          console.error('Image upload failed:', error)
        }
      }

      await annonce.load('utilisateur' as ExtractModelRelations<Annonce>)
      return response.created({ annonce: annonce.serialize() })
    } catch (error) {
      console.error('Error creating annonce:', error)
      return response.status(500).send({
        error: error.message,
        detail: error.detail || 'Unknown error occurred',
      })
    }
  }

  /**
   * @tag Annonces - CRUD
   * @summary Récupérer une annonce par ID
   * @description Affiche les détails d'une annonce spécifique
   */
  async getAnnonce({ request, response }: HttpContext) {
    const annonce = await Annonce.query()
      .where('id', request.param('id'))
      .preload('utilisateur' as ExtractModelRelations<Annonce>)
      .preload('colis')
      .preload('services')
      .firstOrFail()

    return response.ok({ annonce: annonce.serialize() })
  }

  /**
   * @tag Annonces - CRUD
   * @summary Récupérer les annonces d'un utilisateur
   * @description Affiche toutes les annonces créées par un utilisateur spécifique
   */
  async getUserAnnonces({ request, response }: HttpContext) {
    const userId = request.param('utilisateur_id')
    const annonces = await Annonce.query()
      .where('utilisateur_id', userId)
      .preload('utilisateur' as ExtractModelRelations<Annonce>)
      .preload('colis')
      .preload('services')
      .orderBy('created_at', 'desc')

    // Charger aussi les livraisons associées à chaque annonce avec leurs colis
    const annoncesWithLivraisons = await Promise.all(
      annonces.map(async (annonce) => {
        // Récupérer les livraisons de cette annonce
        const livraisons = await db
          .from('livraisons')
          .where('annonce_id', annonce.id)
          .orderBy('created_at', 'desc')

        // Pour chaque livraison, récupérer ses colis
        const livraisonsWithColis = await Promise.all(
          livraisons.map(async (livraison) => {
            const colis = await db
              .from('colis')
              .join('livraison_colis', 'colis.id', '=', 'livraison_colis.colis_id')
              .where('livraison_colis.livraison_id', livraison.id)
              .select('colis.*')

            return {
              ...livraison,
              colis,
            }
          })
        )

        const serialized = annonce.serialize()
        return {
          ...serialized,
          livraisons: livraisonsWithColis,
        }
      })
    )

    return response.ok({ annonces: annoncesWithLivraisons })
  }

  /**
   * @tag Annonces - CRUD
   * @summary Mettre à jour une annonce
   * @description Met à jour les détails d'une annonce existante
   */
  async updateAnnonce({ request, response }: HttpContext) {
    const {
      title,
      description,
      price,
      type,
      status,
      desired_date: desiredDate,
      actual_delivery_date: actualDeliveryDate,
      end_location: endLocation,
      start_location: startLocation,
      priority,
      storage_box_id: storageBoxId,
      insurance_amount: insuranceAmount,
    } = await request.validateUsing(updateAnnonceValidator)

    const annonce = await Annonce.findOrFail(request.param('id'))

    annonce.merge({
      title: title ?? annonce.title,
      description: description ?? annonce.description,
      price: price,
      type: type ?? annonce.type,
      status: status ?? annonce.status, // Nouveau: remplace state
      desiredDate: desiredDate ? DateTime.fromJSDate(new Date(desiredDate)) : annonce.desiredDate, // Nouveau: remplace scheduledDate
      actualDeliveryDate: actualDeliveryDate
        ? DateTime.fromJSDate(new Date(actualDeliveryDate))
        : annonce.actualDeliveryDate,
      endLocation: endLocation ?? annonce.endLocation, // Nouveau: remplace destinationAddress
      startLocation: startLocation ?? annonce.startLocation, // Nouveau: remplace startingAddress
      priority: priority ?? annonce.priority,
      storageBoxId: storageBoxId ?? annonce.storageBoxId,
      insuranceAmount: insuranceAmount ?? annonce.insuranceAmount, // Nouveau champ
    })

    // Gérer l'upload d'image si présent
    const image = request.file('image')
    if (image) {
      const fileName = `${Date.now()}_${image.clientName}`
      try {
        await image.move(app.tmpPath('uploads/annonces'), {
          name: fileName,
        })

        if (image.state === 'moved') {
          annonce.imagePath = `uploads/annonces/${fileName}`
        }
      } catch (error) {
        console.error('Image upload failed:', error)
      }
    }

    await annonce.save()
    await annonce.load('colis')
    await annonce.load('services')
    return response.ok({ annonce: annonce.serialize() })
  }

  // Méthode spéciale pour mettre à jour une annonce en acceptant des dates au format YYYY-MM-DD
  async updateAnnonceWithStringDates({ request, response }: HttpContext) {
    try {
      const annonce = await Annonce.findOrFail(request.param('id'))

      // Récupérer les données du formulaire
      const formData = request.all()

      // Traiter les dates spéciales
      if (formData.desired_date && typeof formData.desired_date === 'string') {
        // Convertir YYYY-MM-DD en objet DateTime
        try {
          annonce.desiredDate = DateTime.fromFormat(formData.desired_date, 'yyyy-MM-dd')
        } catch (e) {
          console.error('Error parsing desired_date:', e)
        }
      }

      if (formData.actual_delivery_date && typeof formData.actual_delivery_date === 'string') {
        try {
          annonce.actualDeliveryDate = DateTime.fromFormat(
            formData.actual_delivery_date,
            'yyyy-MM-dd'
          )
        } catch (e) {
          console.error('Error parsing actual_delivery_date:', e)
        }
      }

      // Mettre à jour les autres champs
      if (formData.title) annonce.title = formData.title
      if (formData.description) annonce.description = formData.description
      if (formData.price !== undefined) annonce.price = formData.price
      if (formData.type) annonce.type = formData.type
      if (formData.status) annonce.status = formData.status // Nouveau: remplace state
      if (formData.end_location) annonce.endLocation = formData.end_location // Nouveau: remplace destination_address
      if (formData.start_location) annonce.startLocation = formData.start_location // Nouveau: remplace starting_address
      if (formData.priority !== undefined) {
        // Convertir la chaîne en booléen
        annonce.priority = formData.priority === 'true' || formData.priority === true
      }
      if (formData.storage_box_id) annonce.storageBoxId = formData.storage_box_id
      if (formData.insurance_amount !== undefined)
        annonce.insuranceAmount = formData.insurance_amount

      // Gérer l'upload d'image si présent
      const image = request.file('image')
      if (image) {
        const fileName = `${Date.now()}_${image.clientName}`
        try {
          await image.move(app.tmpPath('uploads/annonces'), {
            name: fileName,
          })

          if (image.state === 'moved') {
            annonce.imagePath = `uploads/annonces/${fileName}`
          }
        } catch (error) {
          console.error('Image upload failed:', error)
        }
      }

      await annonce.save()
      await annonce.load('colis')
      await annonce.load('services')
      return response.ok({ annonce: annonce.serialize() })
    } catch (error) {
      console.error('Error updating annonce:', error)
      return response.status(500).send({
        error: error.message,
        detail: error.detail || 'Unknown error occurred',
      })
    }
  }

  /**
   * @tag Annonces - CRUD
   * @summary Supprimer une annonce
   * @description Supprime une annonce existante avec vérifications de sécurité
   */
  async delete({ request, response, auth }: HttpContext) {
    try {
      const annonceId = request.param('id')
      const user = await auth.authenticate()

      // Récupérer l'annonce avec l'utilisateur
      const annonce = await Annonce.query()
        .where('id', annonceId)
        .preload('utilisateur' as ExtractModelRelations<Annonce>)
        .first()

      if (!annonce) {
        return response.status(404).send({
          error: 'Annonce non trouvée',
        })
      }

      // Vérifier que l'utilisateur est propriétaire de l'annonce
      if (annonce.utilisateurId !== user.id) {
        return response.status(403).send({
          error: "Vous n'êtes pas autorisé à supprimer cette annonce",
        })
      }

      // Vérifier que l'annonce peut être supprimée (pas de livraisons en cours)
      const livraisons = await db
        .from('livraisons')
        .join('livraison_colis', 'livraisons.id', '=', 'livraison_colis.livraison_id')
        .join('colis', 'livraison_colis.colis_id', '=', 'colis.id')
        .where('colis.annonce_id', annonceId)
        .whereIn('livraisons.status', ['scheduled', 'in_progress'])

      if (livraisons.length > 0) {
        return response.status(400).send({
          error: 'Impossible de supprimer cette annonce car elle a des livraisons en cours',
          livraisons_actives: livraisons.length,
        })
      }

      // Supprimer les colis associés
      await db.from('colis').where('annonce_id', annonceId).delete()

      // Supprimer les relations annonce-services
      await db.from('annonce_services').where('annonce_id', annonceId).delete()

      // Supprimer l'annonce
      await annonce.delete()

      return response.ok({
        message: 'Annonce supprimée avec succès',
        deleted_annonce_id: annonceId,
      })
    } catch (error) {
      console.error('Error deleting annonce:', error)
      return response.status(500).send({
        error: "Erreur lors de la suppression de l'annonce",
        details: error.message,
      })
    }
  }
}
