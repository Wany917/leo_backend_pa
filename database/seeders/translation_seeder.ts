import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Translation from '#models/translation'
import { DateTime } from 'luxon'
import fs from 'fs/promises'
import path from 'path'

export default class extends BaseSeeder {
  async run() {
    console.log('🌐 Importation des traductions depuis les fichiers JSON...\n')

    // Chemin vers les fichiers de traduction du backoffice (source de référence)
    const translationDir = path.join(process.cwd(), '..', 'pa-backoffice', 'locales')

    try {
      // Lister tous les fichiers JSON dans le dossier locales
      const files = await fs.readdir(translationDir)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      console.log(`📁 Fichiers trouvés: ${jsonFiles.join(', ')}\n`)

      for (const file of jsonFiles) {
        const locale = path.basename(file, '.json').toLowerCase()
        const filePath = path.join(translationDir, file)

        console.log(`📝 Traitement de ${locale}...`)

        try {
          // Lire et parser le fichier JSON
          const content = await fs.readFile(filePath, 'utf-8')
          const translations = JSON.parse(content)

          // Fonction récursive pour aplatir l'objet hiérarchique
          const flattenTranslations = (
            obj: any,
            prefix = ''
          ): Array<{ key: string; value: string }> => {
            const result = []

            for (const [key, value] of Object.entries(obj)) {
              const fullKey = prefix ? `${prefix}.${key}` : key

              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Récursion pour les objets imbriqués
                result.push(...flattenTranslations(value, fullKey))
              } else {
                // Valeur finale (string, number, etc.)
                result.push({
                  key: fullKey,
                  value: String(value),
                })
              }
            }

            return result
          }

          const flatTranslations = flattenTranslations(translations)
          console.log(`   └─ ${flatTranslations.length} clés de traduction trouvées`)

          // Supprimer les traductions existantes pour cette locale
          await Translation.query().where('locale', locale).delete()

          // Préparer les données pour l'insertion en lot
          const translationsToInsert = flatTranslations.map((t) => ({
            locale,
            namespace: 'ui', // Namespace par défaut pour l'interface utilisateur
            key: t.key,
            value: t.value,
            metadata: {},
            is_verified: true, // Marquer comme vérifiées car elles viennent des fichiers officiels
            created_at: DateTime.now(),
            updated_at: DateTime.now(),
          }))

          // Insérer par batch pour optimiser les performances
          const batchSize = 100
          for (let i = 0; i < translationsToInsert.length; i += batchSize) {
            const batch = translationsToInsert.slice(i, i + batchSize)
            await Translation.createMany(batch)
          }

          console.log(`   ✅ ${translationsToInsert.length} traductions importées pour ${locale}`)
        } catch (fileError) {
          console.log(`   ❌ Erreur lors du traitement de ${file}:`, fileError.message)
        }
      }

      console.log('\n🎉 Importation terminée avec succès!')

      // Afficher un résumé
      const summary = await Translation.query()
        .select('locale')
        .count('* as total')
        .groupBy('locale')
        .orderBy('locale')

      console.log('\n📊 Résumé par locale:')
      summary.forEach((row) => {
        console.log(`   ${row.locale}: ${row.$extras.total} traductions`)
      })
    } catch (error) {
      console.error("❌ Erreur lors de l'importation:", error.message)
      throw error
    }
  }
}
