import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const serviceTypes = [
      {
        id: 1,
        name: 'Transport de personnes',
        description:
          'Services de transport et accompagnement de personnes (médical, aéroport, etc.)',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        name: 'Services ménagers',
        description: 'Ménage, repassage, entretien du domicile',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        name: "Garde d'animaux",
        description: "Garde et promenade d'animaux de compagnie",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        name: 'Courses et achats',
        description: 'Faire les courses, achats divers pour le compte du client',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 5,
        name: 'Bricolage et jardinage',
        description: 'Petits travaux de bricolage et entretien du jardin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 6,
        name: 'Aide administrative',
        description: 'Assistance pour démarches administratives et papiers',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 7,
        name: "Garde d'enfants",
        description: "Baby-sitting et garde d'enfants à domicile",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 8,
        name: 'Cours particuliers',
        description: 'Soutien scolaire et cours particuliers',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 9,
        name: 'Déménagement',
        description: 'Aide au déménagement et transport de meubles',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 10,
        name: 'Autres services',
        description: 'Autres services à la personne non catégorisés',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('service_types').insert(serviceTypes)
  }
}
