import { BaseSeeder } from '@adonisjs/lucid/seeders'
import JustificationPiece from '#models/justification_piece'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    const justificationPieces = [
      // Justification pieces for delivery people (livreurs)
      {
        utilisateur_id: 5, // Bob Brown (Livreur)
        document_type: 'driving_license',
        file_path: '/uploads/justifications/bob_driving_license.pdf',
        account_type: 'livreur', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 10 }),
        verified_at: DateTime.now().minus({ days: 8 }),
      },
      {
        utilisateur_id: 5, // Bob Brown (Livreur)
        document_type: 'identity_card',
        file_path: '/uploads/justifications/bob_identity.pdf',
        account_type: 'livreur', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 10 }),
        verified_at: DateTime.now().minus({ days: 8 }),
      },
      {
        utilisateur_id: 6, // Charlie Wilson (Livreur)
        document_type: 'driving_license',
        file_path: '/uploads/justifications/charlie_driving_license.pdf',
        account_type: 'livreur', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 15 }),
        verified_at: DateTime.now().minus({ days: 12 }),
      },
      {
        utilisateur_id: 6, // Charlie Wilson (Livreur)
        document_type: 'vehicle_registration',
        file_path: '/uploads/justifications/charlie_vehicle_reg.pdf',
        account_type: 'livreur', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 15 }),
        verified_at: DateTime.now().minus({ days: 12 }),
      },
      // Justification pieces for service providers (prestataires)
      {
        utilisateur_id: 7, // Diana Davis (Prestataire - baby-sitting)
        document_type: 'identity_card',
        file_path: '/uploads/justifications/diana_identity.pdf',
        account_type: 'prestataire', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 20 }),
        verified_at: DateTime.now().minus({ days: 18 }),
      },
      {
        utilisateur_id: 7, // Diana Davis (Prestataire)
        document_type: 'background_check',
        file_path: '/uploads/justifications/diana_background_check.pdf',
        account_type: 'prestataire', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 20 }),
        verified_at: DateTime.now().minus({ days: 18 }),
      },
      {
        utilisateur_id: 7, // Diana Davis (Prestataire)
        document_type: 'certification',
        file_path: '/uploads/justifications/diana_babysitting_cert.pdf',
        account_type: 'prestataire', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 20 }),
        verified_at: DateTime.now().minus({ days: 18 }),
      },
      {
        utilisateur_id: 8, // Eva Miller (Prestataire - house-cleaning)
        document_type: 'identity_card',
        file_path: '/uploads/justifications/eva_identity.pdf',
        account_type: 'prestataire', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 25 }),
        verified_at: DateTime.now().minus({ days: 22 }),
      },
      {
        utilisateur_id: 8, // Eva Miller (Prestataire)
        document_type: 'insurance_certificate',
        file_path: '/uploads/justifications/eva_insurance.pdf',
        account_type: 'prestataire', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 25 }),
        verified_at: DateTime.now().minus({ days: 22 }),
      },
      {
        utilisateur_id: 8, // Eva Miller (Prestataire)
        document_type: 'professional_reference',
        file_path: '/uploads/justifications/eva_references.pdf',
        account_type: 'prestataire', // Add account_type
        verification_status: 'verified',
        uploaded_at: DateTime.now().minus({ days: 25 }),
        verified_at: DateTime.now().minus({ days: 22 }),
      },
    ]

    await JustificationPiece.createMany(justificationPieces)
  }
}
