import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Service from '#models/service'
import Utilisateurs from '#models/utilisateurs'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    const existingServices = await Service.query().limit(1)
    if (existingServices.length > 0) {
      console.log('Des services existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES PRESTATAIRES PAR EMAIL
    const isabelle = await Utilisateurs.findBy('email', 'isabelle.cohen@prestafake.fr')
    const thomas = await Utilisateurs.findBy('email', 'thomas.roux@servicefake.com')
    const sandra = await Utilisateurs.findBy('email', 'sandra.petit@pretafake.org')

    if (!isabelle || !thomas || !sandra) {
      console.log('❌ Prestataires non trouvés pour les services')
      return
    }

    // ✅ SERVICES ECODELI - SELON CAHIER DES CHARGES (services à la personne)
    const services = [
      // =================================================================
      // 🧹 SERVICES MÉNAGE ET ENTRETIEN
      // =================================================================
      {
        prestataireId: isabelle.id,
        name: 'Ménage complet domicile',
        description:
          'Service de ménage professionnel à domicile. Cuisine, salon, chambres, salle de bain. Aspirateur, serpillère, dépoussiérage, nettoyage sanitaires. Produits écologiques fournis.',
        price: 25.0,
        location: '1er, 2ème, 3ème, 4ème arrondissements Paris',
        status: 'available',
        duration: 120, // 2h
        isActive: true,
        service_type_id: null,
        pricing_type: 'hourly' as const,
        hourly_rate: 25.0,
        availability_description: 'Lundi au vendredi 9h-18h, weekend sur demande',
        home_service: true,
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 15 }),
        updatedAt: DateTime.now().minus({ days: 2 }),
      },
      {
        prestataireId: isabelle.id,
        name: 'Repassage express à domicile',
        description:
          "Service de repassage professionnel chez vous. Jusqu'à 20 pièces par session. Fer et table à repasser fournis. Pliage et rangement inclus.",
        price: 35.0,
        location: 'Paris centre (1er au 11ème)',
        status: 'available',
        duration: 90,
        isActive: true,
        service_type_id: null,
        pricing_type: 'fixed' as const,
        hourly_rate: null,
        availability_description: 'Mardi, jeudi, samedi 14h-19h',
        home_service: true,
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 10 }),
        updatedAt: DateTime.now().minus({ days: 1 }),
      },

      // =================================================================
      // 👶 SERVICES GARDE ET ACCOMPAGNEMENT
      // =================================================================
      {
        prestataireId: thomas.id,
        name: "Garde d'enfants ponctuelle",
        description:
          "Garde d'enfants qualifiée pour sorties, rendez-vous ou urgences. Expérience 8 ans, références vérifiées. Activités éducatives, aide aux devoirs possible.",
        price: 15.0,
        location: 'Paris Est (10ème, 11ème, 12ème, 20ème)',
        status: 'available',
        duration: 180, // 3h minimum
        isActive: true,
        service_type_id: null,
        pricing_type: 'hourly' as const,
        hourly_rate: 15.0,
        availability_description: 'Disponible soirs de semaine après 17h et weekends',
        home_service: true,
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 8 }),
        updatedAt: DateTime.now(),
      },
      {
        prestataireId: thomas.id,
        name: 'Accompagnement personnes âgées',
        description:
          'Accompagnement bienveillant pour courses, rendez-vous médicaux, promenades. Formation aide à la personne, patient et attentionné.',
        price: 20.0,
        location: 'Tout Paris',
        status: 'available',
        duration: 120,
        isActive: true,
        service_type_id: null,
        pricing_type: 'hourly' as const,
        hourly_rate: 20.0,
        availability_description: 'Lundi au samedi 8h-20h',
        home_service: false, // Sorties extérieures
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 20 }),
        updatedAt: DateTime.now().minus({ hours: 3 }),
      },

      // =================================================================
      // 🔧 SERVICES TECHNIQUES ET BRICOLAGE
      // =================================================================
      {
        prestataireId: sandra.id,
        name: 'Petits travaux et bricolage',
        description:
          'Montage meubles IKEA, accrochage tableaux, petite plomberie, réparations diverses. Outils professionnels, travail soigné et rapide.',
        price: 45.0,
        location: 'Paris Ouest (7ème, 8ème, 15ème, 16ème, 17ème)',
        status: 'available',
        duration: 60,
        isActive: true,
        service_type_id: null,
        pricing_type: 'custom' as const, // Devis selon travaux
        hourly_rate: 35.0,
        availability_description: 'Interventions sur rendez-vous, délai 48h',
        home_service: true,
        requires_materials: true, // Selon travaux
        createdAt: DateTime.now().minus({ days: 5 }),
        updatedAt: DateTime.now().minus({ hours: 6 }),
      },
      {
        prestataireId: sandra.id,
        name: 'Dépannage informatique domicile',
        description:
          'Installation, configuration, résolution de problèmes informatiques. PC, Mac, tablettes, smartphones. Formation utilisateur incluse.',
        price: 60.0,
        location: 'Île-de-France',
        status: 'validated', // Service vérifié par admin
        duration: 90,
        isActive: true,
        service_type_id: null,
        pricing_type: 'fixed' as const,
        hourly_rate: null,
        availability_description: 'Urgences 7j/7, interventions planifiées semaine',
        home_service: true,
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 30 }),
        updatedAt: DateTime.now().minus({ days: 1 }),
      },

      // =================================================================
      // 📚 SERVICES ÉDUCATIFS
      // =================================================================
      {
        prestataireId: thomas.id,
        name: 'Soutien scolaire mathématiques',
        description:
          'Cours particuliers mathématiques niveau collège-lycée. Méthodologie, exercices, préparation examens. Enseignant certifié, résultats garantis.',
        price: 30.0,
        location: 'Paris 5ème, 6ème, 14ème, 15ème',
        status: 'scheduled', // En cours avec un élève
        duration: 120,
        isActive: true,
        service_type_id: null,
        pricing_type: 'hourly' as const,
        hourly_rate: 30.0,
        availability_description: 'Créneaux disponibles mercredi après-midi et weekend',
        home_service: true,
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 12 }),
        updatedAt: DateTime.now().minus({ hours: 2 }),
      },

      // =================================================================
      // 🚫 SERVICES SUSPENDUS/REFUSÉS (pour test des états)
      // =================================================================
      {
        prestataireId: isabelle.id,
        name: 'Service test suspendu',
        description: 'Service temporairement suspendu pour mise à jour des conditions.',
        price: 20.0,
        location: 'Paris',
        status: 'suspended',
        duration: 60,
        isActive: false,
        service_type_id: null,
        pricing_type: 'fixed' as const,
        hourly_rate: null,
        availability_description: 'Suspendu temporairement',
        home_service: true,
        requires_materials: false,
        createdAt: DateTime.now().minus({ days: 3 }),
        updatedAt: DateTime.now().minus({ hours: 1 }),
      },
    ]

    // ✅ CRÉER LES SERVICES AVEC GESTION D'ERREURS
    for (const serviceData of services) {
      try {
        await Service.create(serviceData)
        console.log(`✅ Service créé: ${serviceData.name} (${serviceData.status})`)
      } catch (error) {
        console.log(`❌ Erreur création service ${serviceData.name}:`, error.message)
      }
    }

    console.log(`✅ ${services.length} services EcoDeli créés avec succès`)
  }
}
