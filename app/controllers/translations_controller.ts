import type { HttpContext } from '@adonisjs/core/http'
import Translation from '#models/translation'
import { createTranslationValidator } from '#validators/create_translation'

export default class TranslationsController {
  /**
   * @tag Traductions
   * @summary Obtenir toutes les traductions pour une locale
   */
  async getByLocale({ params, response }: HttpContext) {
    try {
      const { locale } = params
      const translations = await Translation.query()
        .where('locale', locale)
        .orderBy('namespace', 'asc')
        .orderBy('key', 'asc')

      // Restructurer en format hiérarchique pour les frontends
      const result = {}
      translations.forEach((translation) => {
        const keys = translation.key.split('.')
        let current = result

        // Créer la structure hiérarchique
        // for (let i = 0; i < keys.length - 1; i++) {
        //   if (!current[keys[i]]) {
        //     current[keys[i]] = {}
        //   }
        //   current = current[keys[i]]
        // }

        // current[keys[keys.length - 1]] = translation.value
      })

      return response.ok(result)
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des traductions',
        error: error.message,
      })
    }
  }

  /**
   * @tag Traductions
   * @summary Obtenir toutes les locales disponibles
   */
  async getLocales({ response }: HttpContext) {
    try {
      const locales = await Translation.query()
        .select('locale')
        .groupBy('locale')
        .orderBy('locale', 'asc')

      return response.ok({
        locales: locales.map((t) => t.locale),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des locales',
        error: error.message,
      })
    }
  }

  /**
   * @tag Traductions
   * @summary Créer ou mettre à jour une traduction
   */
  async upsert({ request, response }: HttpContext) {
    try {
      const { locale, namespace, key, value, metadata } = await request.validateUsing(
        createTranslationValidator
      )

      const translation = await Translation.updateOrCreate(
        { locale, namespace, key },
        { value, metadata: metadata || {} }
      )

      return response.ok({ translation })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la sauvegarde de la traduction',
        error: error.message,
      })
    }
  }

  /**
   * @tag Traductions
   * @summary Mettre à jour toutes les traductions d'une locale
   */
  async updateLocale({ params, request, response }: HttpContext) {
    try {
      const { locale } = params
      const { translations } = request.body()

      // Fonction récursive pour aplatir l'objet hiérarchique
      const flattenTranslations = (
        obj: any,
        prefix = ''
      ): Array<{ key: string; value: string }> => {
        const result = []
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key
          if (typeof value === 'object' && value !== null) {
            result.push(...flattenTranslations(value, fullKey))
          } else {
            result.push({ key: fullKey, value: String(value) })
          }
        }
        return result
      }

      const flatTranslations = flattenTranslations(translations)

      // Supprimer toutes les traductions existantes pour cette locale
      await Translation.query().where('locale', locale).delete()

      // Insérer les nouvelles traductions
      const translationsToInsert = flatTranslations.map((t) => ({
        locale,
        namespace: 'ui', // Namespace par défaut
        key: t.key,
        value: t.value,
        metadata: {},
        is_verified: false,
      }))

      await Translation.createMany(translationsToInsert)

      return response.ok({
        message: `Traductions mises à jour pour ${locale}`,
        count: translationsToInsert.length,
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la mise à jour des traductions',
        error: error.message,
      })
    }
  }

  /**
   * @tag Traductions
   * @summary Supprimer une traduction
   */
  async delete({ params, response }: HttpContext) {
    try {
      const { id } = params
      const translation = await Translation.find(id)

      if (!translation) {
        return response.notFound({ message: 'Traduction non trouvée' })
      }

      await translation.delete()
      return response.ok({ message: 'Traduction supprimée avec succès' })
    } catch (error) {
      return response.badRequest({ message: 'Erreur lors de la suppression', error: error.message })
    }
  }

  /**
   * @tag Traductions
   * @summary Synchroniser depuis un fichier JSON
   */
  async syncFromJson({ request, response }: HttpContext) {
    try {
      const { locale, translations } = request.body()

      // Fonction récursive pour aplatir l'objet hiérarchique
      const flattenTranslations = (
        obj: any,
        prefix = ''
      ): Array<{ key: string; value: string }> => {
        const result = []
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key
          if (typeof value === 'object' && value !== null) {
            result.push(...flattenTranslations(value, fullKey))
          } else {
            result.push({ key: fullKey, value: String(value) })
          }
        }
        return result
      }

      const flatTranslations = flattenTranslations(translations)

      // Synchroniser chaque traduction
      for (const t of flatTranslations) {
        await Translation.updateOrCreate(
          { locale, namespace: 'ui', key: t.key },
          { value: t.value, metadata: {}, is_verified: true }
        )
      }

      return response.ok({
        message: `${flatTranslations.length} traductions synchronisées pour ${locale}`,
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la synchronisation',
        error: error.message,
      })
    }
  }
}
