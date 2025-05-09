import type { HttpContext } from '@adonisjs/core/http'
import JustificationPiece from '#models/justification_piece'
import { createJustificationPieceValidator } from '#validators/create_justification_piece'

export default class JustificationPiecesController {
  async create({ request, response }: HttpContext) {
    try {
      const { utilisateur_id, document_type, file_path } = await request.validateUsing(
        createJustificationPieceValidator
      )
      const justificationPiece = await JustificationPiece.create({
        utilisateur_id,
        document_type,
        file_path,
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
      return response.ok(justificationPiece.serialize())
    } catch (error) {
      return response.notFound({ message: 'Justification piece not found', error: error })
    }
  }

  async getUnverified({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.query().where(
        'verification_status',
        'pending'
      )
      return response.ok({
        justificationPieces: justificationPieces.map((piece) => piece.serialize()),
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
}
