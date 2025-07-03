const http = require('http')

function testAPI() {
  http.get('http://localhost:3333/ratings/prestataire/10', (res) => {
    let data = ''
    res.on('data', (chunk) => (data += chunk))
    res.on('end', () => {
      const result = JSON.parse(data)

      console.log('🔍 DEBUG - Analyse des données API:')
      console.log('Total avis:', result.total)
      console.log('Moyenne API:', result.average_rating)

      if (result.reviews.length > 0) {
        console.log('\n📊 Analyse des avis individuels:')
        result.reviews.forEach((review, index) => {
          console.log(`Avis ${index + 1}:`)
          console.log(
            `  - overall_rating: "${review.overall_rating}" (type: ${typeof review.overall_rating})`
          )
          console.log(`  - parseFloat: ${parseFloat(review.overall_rating)}`)
          console.log(`  - isNaN: ${isNaN(parseFloat(review.overall_rating))}`)
        })

        // Test de calcul manuel
        console.log('\n🧮 Test calcul manuel:')
        const values = result.reviews.map((r) => {
          const num = parseFloat(r.overall_rating)
          console.log(`  - "${r.overall_rating}" -> ${num} (valid: ${!isNaN(num)})`)
          return num
        })

        const validValues = values.filter((v) => !isNaN(v))
        console.log(`  - Valeurs valides: [${validValues.join(', ')}]`)

        if (validValues.length > 0) {
          const sum = validValues.reduce((sum, v) => sum + v, 0)
          const avg = sum / validValues.length
          console.log(`  - Somme: ${sum}`)
          console.log(`  - Moyenne: ${avg}`)
          console.log(`  - Moyenne arrondie: ${Math.round(avg * 10) / 10}`)
        }
      }
    })
  })
}

testAPI()
