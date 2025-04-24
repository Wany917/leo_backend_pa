import type { HttpContext } from '@adonisjs/core/http'
import CodeTemporaire from '#models/code_temporaire'
import { generateCodeValidator } from '#validators/generate_code'
import { checkCodeValidator } from '#validators/check_code'

export default class CodeTemporairesController {
    async generate_code({ request, response }: HttpContext) {
        try {
            const { user_info } = await request.validateUsing(generateCodeValidator)
            const code = Math.floor(100000 + Math.random() * 900000).toString()
            await CodeTemporaire.create({
                user_info,
                code,
            })
            return response.ok({ message: 'Code created successfully', returned_code: code })
        } catch (error) {
            return response.badRequest({ error_message: 'Failed to create code', error: error })
        }
    }

    async check_code({ request, response }: HttpContext) {
        try {
            const { user_info, code } = await request.validateUsing(checkCodeValidator)
            const codeTemporaire = await CodeTemporaire.query()
                .where('user_info', JSON.stringify(user_info))
                .where('code', code)
                .first()

            if (codeTemporaire) {
                await CodeTemporaire.query()
                    .where('user_info', JSON.stringify(user_info))
                    .where('code', code)
                    .delete()
                return response.ok({ message: 'Code is valid' })
            } else {
                return response.badRequest({ error_message: 'Invalid code' })
            }
        } catch (error) {
            return response.badRequest({ error_message: 'Failed to check code', error: error })
        }
    }

    async reset_code({ request, response }: HttpContext) {
        try {
            const { user_info } = await request.validateUsing(generateCodeValidator)
            const codeTemporaire = await CodeTemporaire.query()
                .where('user_info', JSON.stringify(user_info))
                .first()

            if (codeTemporaire) {
                await CodeTemporaire.query()
                    .where('user_info', JSON.stringify(user_info))
                    .delete()
                return response.ok({ message: 'Code reset successfully' })
            } else {
                return response.badRequest({ error_message: 'No code found for this user' })
            }
        } catch (error) {
            return response.badRequest({ error_message: 'Failed to reset code', error: error })
        }
    }
}