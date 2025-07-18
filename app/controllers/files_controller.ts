import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Utilisateurs from '#models/utilisateurs'
import JustificationPiece from '#models/justification_piece'
import fs from 'fs/promises'
import path from 'path'

export default class FilesController {
  public async uploadJustification({ request, response }: HttpContext) {
    try {
      const file = request.file('file', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'pdf'],
      })

      if (!file) {
        return response.badRequest({ 
          status: 'error', 
          message: 'No file provided' 
        })
      }

      const utilisateur_id = request.input('utilisateur_id')
      const document_type = request.input('document_type')
      const account_type = request.input('account_type')

      if (!utilisateur_id || !document_type || !account_type) {
        return response.badRequest({
          status: 'error',
          message: 'Missing required fields: utilisateur_id, document_type, account_type'
        })
      }

      const user = await Utilisateurs.findOrFail(utilisateur_id)
      
      const dateStr = DateTime.now().toFormat('yyyyMMdd')
      const userName = `${user.first_name} ${user.last_name}`
      const extension = file.extname || '.pdf'
      const fileName = `${dateStr} - ${document_type === 'idCard' ? 'Id Card' : 'Drivers Licence'} - ${userName}${extension}`

      const uploadsDir = app.makePath('tmp/uploads/justifications')
      await fs.mkdir(uploadsDir, { recursive: true })
      
      path.join(uploadsDir, fileName)
      await file.move(uploadsDir, { name: fileName, overwrite: true })
      
      if (!file.isValid) {
        return response.badRequest({
          status: 'error',
          message: 'File upload failed',
          errors: file.errors
        })
      }

      const justificationPiece = await JustificationPiece.create({
        utilisateur_id,
        document_type,
        file_path: fileName,
        account_type,
        verification_status: 'pending'
      })

      return response.created({
        status: 'success',
        message: 'File uploaded successfully',
        data: {
          id: justificationPiece.id,
          fileName: fileName,
          filePath: `tmp/uploads/justifications/${fileName}`,
          justificationPiece: justificationPiece.serialize()
        }
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Failed to upload file',
        error: error.message
      })
    }
  }

  public async downloadJustification({ params, response }: HttpContext) {
    try {
      let filename: string = params.filename
      filename = decodeURIComponent(filename)

      const justificationPieces = await JustificationPiece.query().where('file_path', filename)
      
      if (!justificationPieces || justificationPieces.length === 0) {
        return response.notFound({
          status: 'error',
          message: 'Justification piece not found : ' + filename
        })
      }

      const justificationPiece = justificationPieces[0]
      const filePath = app.makePath('tmp/uploads/justifications', justificationPiece.file_path)
      

      try {
        await fs.access(filePath)
      } catch {
        return response.notFound({
          status: 'error',
          message: 'File not found on disk'
        })
      }

      return response.download(filePath)
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Internal server error while downloading file',
        error: error.message
      })
    }
  }


  public async deleteJustification({ params, response }: HttpContext) {
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
        message: 'Justification piece deleted successfully'
      })
    } catch (error) {
      return response.notFound({
        status: 'error',
        message: 'Justification piece not found',
        error: error.message
      })
    }
  }


  public async listJustificationFiles({ response }: HttpContext) {
    try {
      const uploadsDir = app.makePath('tmp/uploads/justifications')
      
      try {
        const files = await fs.readdir(uploadsDir)
        const fileDetails = await Promise.all(
          files.map(async (fileName) => {
            const filePath = path.join(uploadsDir, fileName)
            const stats = await fs.stat(filePath)
            return {
              name: fileName,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime
            }
          })
        )
        
        return response.ok({
          status: 'success',
          data: fileDetails
        })
      } catch {
        return response.ok({
          status: 'success',
          data: [],
          message: 'Uploads directory does not exist or is empty'
        })
      }
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Failed to list files',
        error: error.message
      })
    }
  }


  public async upload({ request, response }: HttpContext) {
    const file = request.file('file', {
      size: '10mb',
      extnames: ['jpg', 'png', 'pdf'],
    })

    if (!file) {
      return response.badRequest({ status: 'error', message: 'No file provided' })
    }

    const fileName = `${Date.now()}_${file.clientName}`
    await file.moveToDisk('./', 's3', { name: fileName })

    return response.ok({ status: 'success', message: 'File uploaded', fileName })
  }
}
