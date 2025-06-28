import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Vérifier si des portefeuilles existent déjà
    const existingPortefeuilles = await this.client
      .from('portefeuille_ecodeli')
      .select('*')
      .limit(1)
    if (existingPortefeuilles.length > 0) {
      console.log('Des portefeuilles EcoDeli existent déjà, seeder ignoré')
      return
    }

    // ✅ RÉCUPÉRER TOUS LES UTILISATEURS POUR CRÉER LEURS PORTEFEUILLES
    const users = await Utilisateurs.all()

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé, impossible de créer des portefeuilles')
      return
    }

    // ✅ CRÉATION SANS IDS FIXES - Laisser l'auto-incrémentation
    const portefeuilles = []

    for (const user of users) {
      // Créer un portefeuille pour chaque utilisateur
      portefeuilles.push({
        utilisateur_id: user.id,
        solde_disponible: 0.0, // Portefeuille vide par défaut
        solde_en_attente: 0.0, // Pas de fonds bloqués
        iban: null, // Pas d'IBAN configuré par défaut
        bic: null,
        virement_auto_actif: false, // Virement automatique désactivé
        seuil_virement_auto: 50.0, // Seuil par défaut à 50€
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    // Quelques utilisateurs avec des soldes de test
    const marie = users.find((u) => u.email === 'marie.dupont@gmail.com')
    const ahmed = users.find((u) => u.email === 'ahmed.benali@gmail.com')
    const isabelle = users.find((u) => u.email === 'isabelle.moreau@gmail.com')

    // Ajouter des soldes de test pour certains utilisateurs
    if (marie) {
      const mariePortefeuille = portefeuilles.find((p) => p.utilisateur_id === marie.id)
      if (mariePortefeuille) {
        mariePortefeuille.solde_disponible = 125.5
        mariePortefeuille.iban = 'FR1420041010050500013M02606'
        mariePortefeuille.bic = 'BNPAFRPP'
        mariePortefeuille.virement_auto_actif = true
      }
    }

    if (ahmed) {
      const ahmedPortefeuille = portefeuilles.find((p) => p.utilisateur_id === ahmed.id)
      if (ahmedPortefeuille) {
        ahmedPortefeuille.solde_disponible = 89.75
        ahmedPortefeuille.solde_en_attente = 45.0 // Livraison en cours
      }
    }

    if (isabelle) {
      const isabellePortefeuille = portefeuilles.find((p) => p.utilisateur_id === isabelle.id)
      if (isabellePortefeuille) {
        isabellePortefeuille.solde_disponible = 245.3
        isabellePortefeuille.iban = 'FR1420041010050500013M02607'
        isabellePortefeuille.bic = 'BNPAFRPP'
        isabellePortefeuille.virement_auto_actif = true
        isabellePortefeuille.seuil_virement_auto = 100.0
      }
    }

    await this.client.table('portefeuille_ecodeli').insert(portefeuilles)
    console.log(
      `✅ ${portefeuilles.length} portefeuilles EcoDeli créés avec succès avec auto-incrémentation`
    )
  }
}
