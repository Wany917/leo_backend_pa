import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export default class FilesController {
  public async upload({ request }: HttpContext) {
    const file = request.file('file', {
      size: '10mb',
      extnames: ['jpg', 'png', 'pdf'],
    })

    if (!file) {
      return { status: 'error', message: 'No file provided' }
    }

    const fileName = `${Date.now()}_${file.clientName}`
    await file.moveToDisk('./', 's3', { name: fileName })

    return { status: 'success', message: 'File uploaded', fileName }
  }

  public async serveDocument({ request, response }: HttpContext) {
    try {
      // Replace all %20 with spaces
      const documentPath = request.param('documentPath').replace(/%20/g, ' ')

      // Security check: prevent directory traversal
      if (documentPath.includes('..')) {
        return response.status(400).send({ error_message: 'Invalid document path' })
      }

      // Handle justifications subfolder
      let fullPath
      if (documentPath.startsWith('justifications/')) {
        fullPath = join(app.tmpPath('uploads'), documentPath)
      } else {
        fullPath = join(app.tmpPath('uploads'), 'justifications', documentPath)
      }

      if (!existsSync(fullPath)) {
        console.log(fullPath)
        return response.status(404).send({ error_message: 'Document not found' })
      }

      return response.download(fullPath)
    } catch (error) {
      return response.status(500).send({ error_message: 'Failed to serve document', error })
    }
  }

  public async delete({ request, response }: HttpContext) {
    try {
      // Get filePath from request body instead of URL parameter
      const { filePath } = request.body()

      if (!filePath) {
        return response.status(400).send({ error_message: 'File path is required' })
      }

      // Clean the file path
      const cleanFilePath = filePath.replace(/%20/g, ' ')

      if (cleanFilePath.includes('..')) {
        return response.status(400).send({ error_message: 'Invalid file path' })
      }

      // Handle justifications subfolder path
      let fullPath
      if (cleanFilePath.startsWith('justifications/')) {
        fullPath = join(app.tmpPath('uploads'), cleanFilePath)
      } else {
        fullPath = join(app.tmpPath('uploads'), 'justifications', cleanFilePath)
      }

      if (!existsSync(fullPath)) {
        return response.status(404).send({ error_message: 'File not found' })
      }

      // Delete the file

      await import('node:fs/promises').then((fs) => fs.unlink(fullPath))

      return response.ok({ message: 'File deleted successfully' })
    } catch (error) {
      return response.status(500).send({ message: 'Failed to delete file', error: error })
    }
  }
}
