import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import JustificationPiece from '#models/justification_piece'
import Utilisateur from '#models/utilisateurs'
import { createJustificationPieceValidator } from '#validators/create_justification_piece'
import app from '@adonisjs/core/services/app'

export default class JustificationPiecesController {
  async create({ request, response }: HttpContext) {
    try {
      const { utilisateur_id, document_type, account_type } = await request.validateUsing(
        createJustificationPieceValidator
      )

      const file = request.file('file', {
        size: '10mb',
        extnames: ['jpg', 'png', 'pdf'],
      })

      if (!file) {
        return response.badRequest({ message: 'No file provided' })
      }

      const userData = await Utilisateur.findOrFail(utilisateur_id)

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const extension = file.clientName ? file.clientName.split('.').pop() : ''
      const file_name = `${year}${month}${day} - ${document_type === 'idCard' ? 'Id Card' : 'Driving Licence'} - ${userData.first_name} ${userData.last_name}.${extension}`

      try {
        await file.move(app.tmpPath('uploads/justifications'), {
          name: file_name,
        })

        if (file.state !== 'moved') {
          return response.badRequest({ message: 'Failed to upload file' })
        }
      } catch (error) {
        console.error('File upload failed:', error)
        return response.badRequest({ message: 'Error uploading file', error: error })
      }

      const file_path = `uploads/justifications/${file_name}`
      const justificationPiece = await JustificationPiece.create({
        utilisateur_id,
        document_type,
        file_path,
        verification_status: 'pending',
        account_type // Store the intended account type
      })

      return response.created(justificationPiece.serialize())
    } catch (error) {
      return response.badRequest({ message: 'Error creating justification piece', error: error })
    }
  }

  async getAll({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.all()
      return response.ok({
        justificationPieces: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({ message: 'Error fetching justification pieces', error: error })
    }
  }

  async get({ request, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(request.param('id'))
      
      const serialized = justificationPiece.serialize()
      
      const responseData = {
        ...serialized,
        role_type: serialized.account_type,
        user_id: serialized.utilisateur_id
      }

      return response.ok(responseData)
    } catch (error) {
      return response.notFound({ message: 'Justification piece not found', error: error })
    }
  }

  async getUnverified({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.query()
        .where('verification_status', 'pending')
        .preload('utilisateur' as any, (query) => {
          query
            .select('id', 'first_name', 'last_name', 'email')
            .preload('admin')
            .preload('client')
            .preload('livreur')
            .preload('prestataire')
            .preload('commercant')
        })

      // Add role determination logic
      const piecesWithRoles = justificationPieces.map((piece) => {
        const serialized = piece.serialize()
        const user = serialized.utilisateur

        // Determine role based on which table has an entry
        let role = 'unknown'
        if (user.admin) role = 'admin'
        else if (user.livreur) role = 'livreur'
        else if (user.prestataire) role = 'prestataire'
        else if (user.commercant) role = 'commercant'
        else if (user.client) role = 'client'

        // Clean up the user object and add role
        // In the getUnverified method, modify the cleanUser object:
        const cleanUser = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: role,
          admin: user.admin,
          client: user.client,
          livreur: user.livreur,
          prestataire: user.prestataire,
          commercant: user.commercant,
        }

        return {
          ...serialized,
          utilisateur: cleanUser,
        }
      })

      return response.ok({
        justificationPieces: piecesWithRoles,
      })
    } catch (error) {
      return response.badRequest({
        message: 'Error fetching unverified justification pieces',
        error: error,
      })
    }
  }

  async getVerified({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.query().where(
        'verification_status',
        'verified'
      )
      return response.ok({
        justificationPieces: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Error fetching verified justification pieces',
        error: error,
      })
    }
  }

  async getUserPieces({ request, response }: HttpContext) {
    try {
      const userId = request.param('user_id')
      const justificationPieces = await JustificationPiece.query().where('utilisateur_id', userId)
      return response.ok({
        justificationPieces: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Error fetching user justification pieces',
        error: error,
      })
    }
  }

  async verify({ request, response }: HttpContext) {
    try {
      const id = request.param('id')
      const justificationPiece = await JustificationPiece.findOrFail(id)
      justificationPiece.verification_status = 'verified'
      justificationPiece.verified_at = DateTime.now()
      await justificationPiece.save()
      return response.ok({ justificationPiece: justificationPiece.serialize() })
    } catch (error) {
      return response.badRequest({ message: 'Error verifying justification piece', error: error })
    }
  }

  async reject({ request, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(request.param('id'))
      justificationPiece.verification_status = 'rejected'
      justificationPiece.verified_at = DateTime.now()
      await justificationPiece.save()
      return response.ok(justificationPiece.serialize())
    } catch (error) {
      return response.badRequest({ message: 'Error rejecting justification piece', error: error })
    }
  }
}
