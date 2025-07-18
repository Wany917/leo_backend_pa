import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import JustificationPiece from '#models/justification_piece'
import Utilisateurs from '#models/utilisateurs'
import Livreur from '#models/livreur'
import Prestataire from '#models/prestataire'
import Commercant from '#models/commercant'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import type { ExtractModelRelations } from '@adonisjs/lucid/types/relations'

export default class JustificationPiecesController {

  async create({ request, response }: HttpContext) {
    try {

      const file = request.file('file', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      })

      if (!file) {
        return response.badRequest({
          status: 'error',
          message: 'No file provided',
        })
      }


      const utilisateur_id = request.input('utilisateur_id')
      const document_type = request.input('document_type')
      const account_type = request.input('account_type')

      if (!utilisateur_id || !document_type || !account_type) {
        return response.badRequest({
          status: 'error',
          message: 'Missing required fields: utilisateur_id, document_type, account_type',
        })
      }

      const user = await Utilisateurs.findOrFail(utilisateur_id)

      const dateStr = DateTime.now().toFormat('yyyyMMdd')
      const userName = `${user.first_name} ${user.last_name}`
      const extension = file.extname || '.pdf'
      const fileName = `${dateStr} - ${document_type === 'idCard' ? 'Id Card' : 'Drivers Licence'} - ${userName}.${extension}`

      const uploadsDir = app.makePath('tmp/uploads/justifications')
      await fs.mkdir(uploadsDir, { recursive: true })

      await file.move(uploadsDir, { name: fileName, overwrite: true })

      if (!file.isValid) {
        return response.badRequest({
          status: 'error',
          message: 'File upload failed',
          errors: file.errors,
        })
      }

      const justificationPiece = await JustificationPiece.create({
        utilisateur_id,
        document_type,
        file_path: fileName,
        account_type,
        verification_status: 'pending',
      })

      return response.created({
        status: 'success',
        message: 'Justification piece created successfully',
        data: justificationPiece.serialize(),
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error creating justification piece',
        error: error.message,
      })
    }
  }

  async downloadFile({ params, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(params.id)
      const filePath = app.makePath('tmp/uploads/justifications', justificationPiece.file_path)

      try {
        await fs.access(filePath)
      } catch {
        return response.notFound({
          status: 'error',
          message: 'File not found on disk',
        })
      }

      return response.download(filePath)
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message,
      })
    }
  }

  async getAll({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.query().preload(
        'utilisateur' as unknown as ExtractModelRelations<JustificationPiece>,
        (userQuery: any) => {
          userQuery.preload('admin')
          userQuery.preload('client')
          userQuery.preload('livreur')
          userQuery.preload('prestataire')
          userQuery.preload('commercant')
        }
      )
      return response.ok({
        status: 'success',
        data: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error fetching justification pieces',
        error: error.message,
      })
    }
  }

  async get({ request, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.query()
        .where('id', request.param('id'))
        .preload(
          'utilisateur' as unknown as ExtractModelRelations<JustificationPiece>,
          (userQuery: any) => {
            userQuery.preload('admin')
            userQuery.preload('client')
            userQuery.preload('livreur')
            userQuery.preload('prestataire')
            userQuery.preload('commercant')
          }
        )
        .firstOrFail()
      return response.ok({
        status: 'success',
        data: justificationPiece.serialize(),
      })
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message,
      })
    }
  }

  async getUnverified({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.query()
        .where('verification_status', 'pending')
        .preload(
          'utilisateur' as unknown as ExtractModelRelations<JustificationPiece>,
          (userQuery: any) => {
            userQuery.preload('admin')
            userQuery.preload('client')
            userQuery.preload('livreur')
            userQuery.preload('prestataire')
            userQuery.preload('commercant')
          }
        )
      return response.ok({
        status: 'success',
        data: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error fetching unverified justification pieces',
        error: error.message,
      })
    }
  }

  async getVerified({ response }: HttpContext) {
    try {
      const justificationPieces = await JustificationPiece.query()
        .where('verification_status', 'verified')
        .preload(
          'utilisateur' as unknown as ExtractModelRelations<JustificationPiece>,
          (userQuery: any) => {
            userQuery.preload('admin')
            userQuery.preload('client')
            userQuery.preload('livreur')
            userQuery.preload('prestataire')
            userQuery.preload('commercant')
          }
        )
      return response.ok({
        status: 'success',
        data: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error fetching verified justification pieces',
        error: error.message,
      })
    }
  }

  async getUserPieces({ request, response }: HttpContext) {
    try {
      const userId = request.param('utilisateur_id')
      const justificationPieces = await JustificationPiece.query()
        .where('utilisateur_id', userId)
        .preload(
          'utilisateur' as unknown as ExtractModelRelations<JustificationPiece>,
          (userQuery: any) => {
            userQuery.preload('admin')
            userQuery.preload('client')
            userQuery.preload('livreur')
            userQuery.preload('prestataire')
            userQuery.preload('commercant')
          }
        )
      return response.ok({
        status: 'success',
        data: justificationPieces.map((piece) => piece.serialize()),
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error fetching user justification pieces',
        error: error.message,
      })
    }
  }

  async verify({ request, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(request.param('id'))

      const userId = justificationPiece.utilisateur_id
      const accountType = justificationPiece.account_type



      let roleAlreadyExists = false
      try {
        switch (accountType) {
          case 'livreur':
            const existingLivreur = await Livreur.find(userId)
            roleAlreadyExists = !!existingLivreur
            break
          case 'prestataire':
            const existingPrestataire = await Prestataire.find(userId)
            roleAlreadyExists = !!existingPrestataire
            break
          case 'commercant':
            const existingCommercant = await Commercant.find(userId)
            roleAlreadyExists = !!existingCommercant
            break
        }
      } catch (roleCheckError) {
      }

      if (roleAlreadyExists) {
        const pendingDocuments = await JustificationPiece.query()
          .where('utilisateur_id', userId)
          .where('account_type', accountType)
          .where('verification_status', 'pending')

        for (const doc of pendingDocuments) {
          doc.verification_status = 'verified'
          doc.verified_at = DateTime.now()
          await doc.save()
        }

        return response.ok({
          status: 'success',
          message: `All ${pendingDocuments.length} pending documents auto-validated (role already exists)`,
          data: {
            validatedDocuments: pendingDocuments.length,
            reason: 'Role already exists for user',
          },
        })
      }


      justificationPiece.verification_status = 'verified'
      justificationPiece.verified_at = DateTime.now()
      await justificationPiece.save()



      try {
        switch (accountType) {
          case 'livreur':
            await Livreur.create({
              id: userId,
              availabilityStatus: 'available',
              rating: null,
            })

            break

          case 'prestataire':
            await Prestataire.create({
              id: userId,
              service_type: null,
              rating: null,
            })

            break

          case 'commercant':
            await Commercant.create({
              id: userId,
              storeName: 'Nom du magasin à définir',
              businessAddress: null,
              contactNumber: null,
              contractStartDate: DateTime.now(),
              contractEndDate: DateTime.now().plus({ years: 1 }),
              verificationState: 'verified',
            })

            break

          default:
        }
      } catch (roleError) {
      }

      return response.ok({
        status: 'success',
        message: 'Justification piece verified successfully and role created',
        data: justificationPiece.serialize(),
      })
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message,
      })
    }
  }

  async reject({ request, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(request.param('id'))
      const { comments } = request.only(['comments'])

      justificationPiece.verification_status = 'rejected'

      if (comments) {
      }

      await justificationPiece.save()

      return response.ok({
        status: 'success',
        message: 'Justification piece rejected successfully',
        data: justificationPiece.serialize(),
      })
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message,
      })
    }
  }


  async delete({ params, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(params.id)
      const filePath = app.makePath('tmp/uploads/justifications', justificationPiece.file_path)


      try {
        await fs.unlink(filePath)
      } catch (error) {
      }
      await justificationPiece.delete()

      return response.ok({
        status: 'success',
        message: 'Justification piece deleted successfully',
      })
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message,
      })
    }
  }


  async downloadById({ params, response }: HttpContext) {
    try {
      const justificationPiece = await JustificationPiece.findOrFail(params.id)
      const filePath = app.makePath('tmp/uploads/justifications', justificationPiece.file_path)


      try {
        await fs.access(filePath)
      } catch {
        return response.notFound({
          status: 'error',
          message: 'File not found on disk',
        })
      }

      return response.download(filePath)
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message,
      })
    }
  }
}
