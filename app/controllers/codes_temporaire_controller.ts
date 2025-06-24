import type { HttpContext } from '@adonisjs/core/http'
import CodeTemporaire from '#models/code_temporaire'
import { generateCodeValidator } from '#validators/generate_code'
import { checkCodeValidator } from '#validators/check_code'

export default class CodeTemporairesController {
  async generate_code({ request, response }: HttpContext) {
    const { user_info: userInfo } = await request.validateUsing(generateCodeValidator)

    console.log('🔍 DEBUG generate_code - userInfo:', userInfo)

    const userExists = await CodeTemporaire.query().where('user_info', userInfo).first()

    if (userExists) {
      console.log('🔍 DEBUG - Code exists, deleting old one')
      // Supprimer l'ancien code au lieu de rejeter
      await CodeTemporaire.query().where('user_info', userInfo).delete()
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('🔍 DEBUG - Generated code:', code)

    try {
      await CodeTemporaire.create({ user_info: userInfo, code })
      console.log('🔍 DEBUG - Code created successfully')
      return response.ok({ message: 'Code created successfully', code: code })
    } catch (error) {
      console.log('🔴 DEBUG - Error creating code:', error)
      return response.badRequest({ error_message: 'Failed to create code', error })
    }
  }

  async check_code({ request, response }: HttpContext) {
    try {
      const { user_info: userInfo, code } = await request.validateUsing(checkCodeValidator)

      console.log('🔍 DEBUG check_code - userInfo received:', userInfo)
      console.log('🔍 DEBUG check_code - code received:', code)

      // Regardons tous les codes en base pour ce user_info
      const allCodes = await CodeTemporaire.query().where('user_info', userInfo)

      console.log('🔍 DEBUG check_code - found codes in DB:', allCodes.length)
      if (allCodes.length > 0) {
        console.log('🔍 DEBUG check_code - first code details:', {
          stored_user_info: allCodes[0].user_info,
          stored_code: allCodes[0].code,
          received_code: code,
        })
      }

      const codeTemporaire = await CodeTemporaire.query()
        .where('user_info', userInfo)
        .where('code', code)
        .first()

      if (codeTemporaire) {
        console.log('🔍 DEBUG check_code - Code found and valid!')
        await CodeTemporaire.query().where('user_info', userInfo).where('code', code).delete()
        return response.ok({ message: 'Code is valid' })
      } else {
        console.log('🔴 DEBUG check_code - Code NOT found!')
        return response.badRequest({ error_message: 'Invalid code' })
      }
    } catch (error) {
      console.log('🔴 DEBUG check_code - Exception:', error)
      return response.badRequest({ error_message: 'Failed to check code', error: error })
    }
  }

  async reset_code({ request, response }: HttpContext) {
    try {
      const { user_info: userInfo } = await request.validateUsing(generateCodeValidator)

      console.log('🔍 DEBUG reset_code - userInfo:', userInfo)

      const codeTemporaire = await CodeTemporaire.query().where('user_info', userInfo).first()

      const newCode = Math.floor(100000 + Math.random() * 900000).toString()
      console.log('🔍 DEBUG reset_code - Generated new code:', newCode)

      if (codeTemporaire) {
        console.log('🔍 DEBUG reset_code - Existing code found, updating it')
        await CodeTemporaire.query().where('user_info', userInfo).update({ code: newCode })
      } else {
        console.log('🔍 DEBUG reset_code - No existing code, creating new one')
        await CodeTemporaire.create({ user_info: userInfo, code: newCode })
      }

      console.log('🔍 DEBUG reset_code - Code reset/created successfully')
      return response.ok({ message: 'Code reset successfully', code: newCode })
    } catch (error) {
      console.log('🔴 DEBUG reset_code - Exception:', error)
      return response.badRequest({ error_message: 'Failed to reset code', error: error })
    }
  }
}
