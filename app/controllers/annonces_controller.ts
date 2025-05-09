import type { HttpContext } from '@adonisjs/core/http'
import Annonce from '#models/annonce'
import { annonceValidator } from '#validators/create_annonce'
import { updateAnnonceValidator } from '#validators/update_annonce'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
export default class AnnoncesController {
  async create({ request, response }: HttpContext) {
    const {
      utilisateur_id,
      title,
      description,
      tags,
      price,
      scheduled_date,
      actual_delivery_date,
    } = await request.validateUsing(annonceValidator)

    const annonce = await Annonce.create({
      utilisateurId: utilisateur_id,
      title,
      description: description ?? null,
      price: price,
      tags: tags ?? [],
      state: 'open',
      scheduled_date: scheduled_date ? DateTime.fromJSDate(scheduled_date) : null,
      actual_delivery_date: actual_delivery_date ? DateTime.fromJSDate(actual_delivery_date) : null,
    })
    await annonce.load('utilisateur' as ExtractModelRelations<Annonce>)
    return response.created({ annonce: annonce.serialize() })
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
    const { title, description, price, state, scheduled_date, actual_delivery_date } =
      await request.validateUsing(updateAnnonceValidator)
    const annonce = await Annonce.findOrFail(request.param('id'))
    annonce.merge({
      title: title ?? annonce.title,
      description: description ?? annonce.description,
      price: price,
      state: state ?? annonce.state,
      scheduledDate: scheduled_date ? DateTime.fromJSDate(scheduled_date) : annonce.scheduledDate,
      actualDeliveryDate: actual_delivery_date
        ? DateTime.fromJSDate(actual_delivery_date)
        : annonce.actualDeliveryDate,
    })
    await annonce.save()
    await annonce.load('colis')
    await annonce.load('services')
    return response.ok({ annonce: annonce.serialize() })
  }
}
