const { Database } = require('@adonisjs/lucid/database')

async function checkRatingsSync() {
  try {
    // Vérifier les avis dans la base
    const ratings = await Database.from('ratings')
      .select('*')
      .where('rating_type', 'service')
      .where('is_visible', true)

    console.log(`📊 Total des avis visibles: ${ratings.length}`)

    if (ratings.length > 0) {
      console.log('🔍 Détails des avis:')
      ratings.forEach((rating) => {
        console.log(
          `   - Avis ${rating.id}: prestataire ${rating.reviewed_id}, note ${rating.overall_rating}`
        )
      })

      // Regrouper par prestataire
      const ratingsByPrestataire = ratings.reduce((acc, rating) => {
        if (!acc[rating.reviewed_id]) {
          acc[rating.reviewed_id] = []
        }
        acc[rating.reviewed_id].push(rating)
        return acc
      }, {})

      console.log('\n📈 Notes par prestataire:')
      for (const [prestataireId, prestataireRatings] of Object.entries(ratingsByPrestataire)) {
        const avgRating =
          prestataireRatings.reduce((sum, r) => sum + r.overall_rating, 0) /
          prestataireRatings.length
        const roundedAvg = Math.round(avgRating * 10) / 10
        console.log(
          `   - Prestataire ${prestataireId}: ${prestataireRatings.length} avis, moyenne ${roundedAvg}`
        )

        // Mettre à jour directement
        await Database.from('prestataires')
          .where('id', prestataireId)
          .update({ rating: roundedAvg })

        console.log(`     ✅ Note mise à jour: ${roundedAvg}`)
      }
    } else {
      console.log('⚠️  Aucun avis trouvé')
    }

    // Vérifier les notes actuelles des prestataires
    const prestataires = await Database.from('prestataires').select('id', 'rating')
    console.log('\n🏪 Notes actuelles des prestataires:')
    prestataires.forEach((p) => {
      console.log(`   - Prestataire ${p.id}: ${p.rating || 'null'}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }
}

checkRatingsSync()
