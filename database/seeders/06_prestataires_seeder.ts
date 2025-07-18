import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    const existingPrestataires = await this.client.from('prestataires').count('* as total')
    if (Number(existingPrestataires[0].total) > 0) {
      console.log(
        `ℹ️ ${existingPrestataires[0].total} prestataires déjà présents, mise à jour/complétion...`
      )
    }

    const isabelle = await Utilisateurs.findBy('email', 'isabelle.cohen@prestafake.fr')
    const thomas = await Utilisateurs.findBy('email', 'thomas.roux@servicefake.com')
    const sandra = await Utilisateurs.findBy('email', 'sandra.petit@pretafake.org')

    if (!isabelle || !thomas || !sandra) {
      console.log('❌ Utilisateurs prestataires manquants, seeder ignoré')
      return
    }

    const prestataires = [
      {
        id: isabelle.id,
        service_type: 'transport_personnes',
        rating: 4.9,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: thomas.id,
        service_type: 'services_menagers',
        rating: 4.7,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: sandra.id,
        service_type: 'services_techniques',
        rating: 4.8,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]
    for (const p of prestataires) {
      const existing = await this.client.from('prestataires').where('id', p.id).first()
      if (existing) {
        await this.client.from('prestataires').where('id', p.id).update({
          service_type: p.service_type,
          rating: p.rating,
          updated_at: new Date(),
        })
      } else {
        await this.client.table('prestataires').insert(p)
      }
    }

    console.log('✅ Prestataires vérifiés / insérés (upsert)')
  }
}
