import type { HttpContext } from '@adonisjs/core/http'
import Annonce from '#models/annonce'
import { annonceValidator } from '#validators/create_annonce'
import { updateAnnonceValidator } from '#validators/update_annonce'

export default class AnnoncesController {
    async create({ request, response }: HttpContext) {
        const { user_id, title, description, state } = await request.validateUsing(annonceValidator)
        const annonce = await Annonce.create({
            utilisateurId: user_id,
            title,
            description: description ?? null,
            state: state ?? 'open',
        })
        await annonce.load('utilisateur')
        return response.created({ annonce: annonce.serialize() })
    }
    
    async show({ request, response }: HttpContext) {
        const annonce = await Annonce.query()
            .where('id', request.param('id'))
            .preload('utilisateur')
            .preload('colis')
            .preload('services')
            .firstOrFail()
    
        return response.ok({ annonce: annonce.serialize() })
    }
    
    async update({ request, response }: HttpContext) {
        const payload = await request.validateUsing(updateAnnonceValidator)
        const annonce = await Annonce.findOrFail(request.param('id'))
        annonce.merge({
            title:       payload.title       ?? annonce.title,
            description: payload.description ?? annonce.description,
            state:       payload.state       ?? annonce.state,
        })
        await annonce.save()
        await annonce.load('colis')
        await annonce.load('services')
        return response.ok({ annonce: annonce.serialize() })
    }
}
