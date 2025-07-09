import { BaseSeeder } from '@adonisjs/lucid/seeders'
import JustificationPiece from '#models/justification_piece'
import { DateTime } from 'luxon'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    // Emails cibles
    const livreurEmails = [
      'pierre.durand@livreur-test.fr',
      'julie.moreau@livreurfake.com',
      'alex.bernard@livreur-test.org',
    ]

    const prestataireEmails = ['isabelle.cohen@prestafake.fr', 'thomas.roux@servicefake.com']

    const pieces = []

    // Génération pour livreurs
    for (const email of livreurEmails) {
      const user = await Utilisateurs.findBy('email', email)
      if (!user) continue

      pieces.push(
        {
          utilisateur_id: user.id,
          document_type: 'driving_licence',
          file_path: `/uploads/justifications/${email.split('@')[0]}_driving.pdf`,
          account_type: 'livreur',
          verification_status: 'verified' as const,
          uploaded_at: DateTime.now().minus({ days: 7 }),
          verified_at: DateTime.now().minus({ days: 6 }),
        },
        {
          utilisateur_id: user.id,
          document_type: 'id_card',
          file_path: `/uploads/justifications/${email.split('@')[0]}_id.pdf`,
          account_type: 'livreur',
          verification_status: 'verified' as const,
          uploaded_at: DateTime.now().minus({ days: 7 }),
          verified_at: DateTime.now().minus({ days: 6 }),
        }
      )
    }

    // Génération pour prestataires
    for (const email of prestataireEmails) {
      const user = await Utilisateurs.findBy('email', email)
      if (!user) continue

      pieces.push(
        {
          utilisateur_id: user.id,
          document_type: 'identity_card',
          file_path: `/uploads/justifications/${email.split('@')[0]}_identity.pdf`,
          account_type: 'prestataire',
          verification_status: 'verified' as const,
          uploaded_at: DateTime.now().minus({ days: 10 }),
          verified_at: DateTime.now().minus({ days: 9 }),
        },
        {
          utilisateur_id: user.id,
          document_type: 'background_check',
          file_path: `/uploads/justifications/${email.split('@')[0]}_background.pdf`,
          account_type: 'prestataire',
          verification_status: 'verified' as const,
          uploaded_at: DateTime.now().minus({ days: 10 }),
          verified_at: DateTime.now().minus({ days: 9 }),
        }
      )
    }

    if (pieces.length > 0) {
      await JustificationPiece.createMany(pieces)
      console.log(`✅ ${pieces.length} pièces justificatives créées`)
    } else {
      console.log('❌ Aucun utilisateur trouvé pour les pièces justificatives')
    }
  }
}
