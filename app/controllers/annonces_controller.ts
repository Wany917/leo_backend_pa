import type { HttpContext } from '@adonisjs/core/http'
import Annonce from '#models/annonce'
import { annonceValidator } from '#validators/create_annonce'

export default class AnnoncesController {
    async create({ request, response }: HttpContext) {
        try {
            const { user_id, title, description, tags, state } = await request.validateUsing(annonceValidator)
            const annonce = await Annonce.create({
                user_id: user_id,
                title: title,
                description: description,
                tags: tags,
                state: state
            })
            return response.created({ message: 'Annonce created successfully', annonce: annonce.serialize() })
        } catch (error) {
            return response.badRequest({ message: 'Invalid data', error_code: error })
        }
    }

    async getAnnonce({ request, response }: HttpContext) {
        try {
            const annonces = await Annonce.findOrFail(request.param('id'))
            return response.ok({ annonce: annonces })
        } catch (error) {
            return response.notFound({ message: 'Annonce not found', error_code: error })
        }
    }

    async updateAnnonce({ request, response }: HttpContext) {
        try {
            const annonce = await Annonce.findOrFail(request.param('id'))
            annonce.merge(request.body())
            await annonce.save()
            return response.ok(annonce)
        } catch (error) {
            return response.badRequest({ message: 'Wrong Parametters', error_code: error })
        }
    }
}
