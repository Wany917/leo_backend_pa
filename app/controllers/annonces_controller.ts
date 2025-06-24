import type { HttpContext } from '@adonisjs/core/http'
import Annonce from '#models/annonce'
import { annonceValidator } from '#validators/create_annonce'
import { updateAnnonceValidator } from '#validators/update_annonce'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'

export default class AnnoncesController {
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

  async getAllAnnonces({ request, response }: HttpContext) {
    const annonces = await Annonce.query().preload('utilisateur' as ExtractModelRelations<Annonce>)
    return response.ok({ annonces: annonces.map((annonce) => annonce.serialize()) })
  }

  async getUserAnnonces({ request, response }: HttpContext) {
    const userId = request.param('utilisateur_id')
    const annonces = await Annonce.query()
      .where('utilisateur_id', userId)
      .preload('utilisateur' as ExtractModelRelations<Annonce>)
      .preload('colis')
      .preload('services')
      .orderBy('created_at', 'desc')
    return response.ok({ annonces: annonces.map((annonce) => annonce.serialize()) })
  }

  async getAnnonce({ request, response }: HttpContext) {
    const annonce = await Annonce.query()
      .where('id', request.param('id'))
      .preload('utilisateur' as ExtractModelRelations<Annonce>)
      .preload('colis')
      .preload('services')
      .firstOrFail()

    return response.ok({ annonce: annonce.serialize() })
  }

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
}
