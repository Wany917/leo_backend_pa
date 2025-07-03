import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des services existent déjà
    const existingServices = await this.client.from('services').select('*').limit(1)
    if (existingServices.length > 0) {
      console.log('Des services existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER LES PRESTATAIRES PAR EMAIL PLUTÔT QUE PAR ID FIXE
    const isabelle = await Utilisateurs.findBy('email', 'isabelle.moreau@gmail.com')
    const thomas = await Utilisateurs.findBy('email', 'thomas.petit@services.fr')

    if (!isabelle || !thomas) {
      console.log('❌ Prestataires non trouvés, vérifiez les seeders précédents')
      return
    }

    // Récupérer les IDs des prestataires depuis la table prestataires
    const isabellePrestataire = await this.client
      .from('prestataires')
      .where('id', isabelle.id)
      .first()
    const thomasPrestataire = await this.client.from('prestataires').where('id', thomas.id).first()

    if (!isabellePrestataire || !thomasPrestataire) {
      console.log('❌ Profils prestataires non trouvés')
      return
    }

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const services = [
      // Services d'Isabelle Moreau - Transport de personnes
      {
        prestataireId: isabellePrestataire.id, // ID dynamique
        service_type_id: 1, // Transport de personnes
        name: 'Transport médical Paris Intra-muros',
        description:
          'Transport adapté pour personnes à mobilité réduite avec accompagnement médical',
        price: 35.0,
        pricing_type: 'fixed',
        hourly_rate: null,
        location: 'Paris Intra-muros',
        status: 'available',
        duration: 120, // 2 heures
        availability_description: 'Lundi à vendredi, 8h-18h',
        home_service: true,
        requires_materials: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        prestataireId: isabellePrestataire.id, // ID dynamique
        service_type_id: 1,
        name: 'Trajet aéroport Charles de Gaulle',
        description: 'Transport vers/depuis CDG avec assistance bagages',
        price: 65.0,
        pricing_type: 'fixed',
        hourly_rate: null,
        location: 'Paris - CDG',
        status: 'available',
        duration: 180, // 3 heures
        availability_description: 'Tous les jours, 24h/24',
        home_service: true,
        requires_materials: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Services de Thomas Petit - Services ménagers
      {
        prestataireId: thomasPrestataire.id, // ID dynamique
        service_type_id: 2, // Services ménagers
        name: 'Grand ménage appartement T2/T3',
        description:
          'Ménage complet avec produits écologiques inclus - fenêtres, sols, salle de bain',
        price: 75.0,
        pricing_type: 'fixed',
        hourly_rate: null,
        location: 'Lille et métropole',
        status: 'available',
        duration: 240, // 4 heures
        availability_description: 'Lundi à samedi, 8h-17h',
        home_service: true,
        requires_materials: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        prestataireId: thomasPrestataire.id, // ID dynamique
        service_type_id: 2,
        name: 'Ménage régulier hebdomadaire',
        description: 'Service de ménage hebdomadaire pour maintenance courante',
        price: 45.0,
        pricing_type: 'fixed',
        hourly_rate: null,
        location: 'Lille',
        status: 'available',
        duration: 120, // 2 heures
        availability_description: 'Lundi à vendredi, 9h-16h',
        home_service: true,
        requires_materials: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        prestataireId: thomasPrestataire.id, // ID dynamique
        service_type_id: 2,
        name: 'Nettoyage après déménagement',
        description: 'Remise en état complète après déménagement - état des lieux',
        price: 120.0,
        pricing_type: 'fixed',
        hourly_rate: null,
        location: 'Lille et environs',
        status: 'available',
        duration: 360, // 6 heures
        availability_description: 'Sur rendez-vous, 7j/7',
        home_service: true,
        requires_materials: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Service avec tarif horaire pour test
      {
        prestataireId: isabellePrestataire.id, // ID dynamique
        service_type_id: 7, // Garde d'enfants
        name: 'Baby-sitting occasionnel',
        description: "Garde d'enfants ponctuelle pour sorties ou événements",
        price: 0.0, // Prix fixe à 0 car tarif horaire
        pricing_type: 'hourly',
        hourly_rate: 12.0,
        location: 'Paris et banlieue',
        status: 'available',
        duration: null, // Variable selon la demande
        availability_description: 'Soirées et weekends',
        home_service: true,
        requires_materials: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Service complété pour test
      {
        prestataireId: isabellePrestataire.id, // ID dynamique
        service_type_id: 1,
        name: 'Transport urgent hôpital',
        description: "Transport d'urgence pour examen médical",
        price: 50.0,
        pricing_type: 'fixed',
        hourly_rate: null,
        location: 'Paris 11ème vers Hôpital Saint-Antoine',
        status: 'completed',
        duration: 90,
        availability_description: 'Urgences 24h/24',
        home_service: true,
        requires_materials: false,
        is_active: true,
        created_at: new Date('2025-01-20'),
        updated_at: new Date('2025-01-20'),
      },
    ]

    await this.client.table('services').insert(services)
    console.log(`✅ ${services.length} services créés avec succès avec auto-incrémentation`)
  }
}
