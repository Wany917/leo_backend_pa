import type { HttpContext } from '@adonisjs/core/http'
import Annonce from '#models/annonce'
import { annonceValidator } from '#validators/create_annonce'
import { updateAnnonceValidator } from '#validators/update_annonce'

export default class AnnoncesController {
    async create({ request, response }: HttpContext) {
        const { utilisateur_id, title, description, tags } =
        await request.validateUsing(annonceValidator)
    
        const annonce = await Annonce.create({
            utilisateurId: utilisateur_id, 
            title,
            description: description ?? null,
            tags:        tags ?? [],
            state:       'open',
        })
        await annonce.load('utilisateur')
        return response.created({ annonce: annonce.serialize() })
    }

    async getUserAnnonces({ request, response }: HttpContext) {
        const userId = request.param('utilisateur_id')
        const annonces = await Annonce.query()
            .where('utilisateur_id', userId)
            .preload('utilisateur')
            .preload('colis')
            .preload('services')
            .orderBy('created_at', 'desc')
        return response.ok({ annonces: annonces.map((annonce) => annonce.serialize()) })
    }

    async getUserAnnonces({ request, response }: HttpContext) {
        const annonce = await Annonce.query()
            .where('id', request.param('id'))
            .preload('utilisateur')
            .preload('colis')
            .preload('services')
            .firstOrFail()

        return response.ok({ annonce: annonce.serialize() })
    }

    async updateAnnonce({ request, response }: HttpContext) {
        const payload = await request.validateUsing(updateAnnonceValidator)
        const annonce = await Annonce.findOrFail(request.param('id'))
        annonce.merge({
            title: payload.title ?? annonce.title,
            description: payload.description ?? annonce.description,
            state: payload.state ?? annonce.state,
        })
        await annonce.save()
        await annonce.load('colis')
        await annonce.load('services')
        return response.ok({ annonce: annonce.serialize() })
    }
}
