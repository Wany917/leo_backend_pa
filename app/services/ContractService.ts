import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import fs from 'node:fs'
import PDFDocument from 'pdfkit'
import Contract from '#models/contract'

export default class ContractService {
  public async createContract(commercantId: number) {
    // 1. Create contract in database
    const newContract = await Contract.create({
      commercantId: commercantId,
      name: `Contrat Annuel ${DateTime.now().year}`,
      description: `Contrat standard pour l'année ${DateTime.now().year}.`,
      price: 119.99, // Default price
      startDate: DateTime.now(),
      endDate: DateTime.now().plus({ years: 1 }),
      status: 'active',
    })

    // 2. Generate and save PDF
    await this.generateContractPdf(newContract)

    return newContract
  }

  public async generateContractPdf(contract: Contract) {
    const pdfPath = app.tmpPath('uploads/contracts')
    const pdfFileName = `contract_${contract.id}.pdf`
    const fullPdfPath = `${pdfPath}/${pdfFileName}`

    // Ensure directory exists
    await fs.promises.mkdir(pdfPath, { recursive: true })

    const doc = new PDFDocument({ margin: 50 })
    const writeStream = fs.createWriteStream(fullPdfPath)
    doc.pipe(writeStream)

    // --- PDF Content ---
    doc.fontSize(25).text('Contrat de Service EcoDeli', { align: 'center' })
    doc.moveDown(2)
    doc.fontSize(12).text(`Contrat N°: ${contract.id}`)
    doc.text(`Commerçant ID: ${contract.commercantId}`)
    doc.text(`Date de début: ${contract.startDate.toFormat('dd/MM/yyyy')}`)
    doc.text(`Date de fin: ${contract.endDate.toFormat('dd/MM/yyyy')}`)
    doc.moveDown()
    doc.text(`Nom du contrat: ${contract.name}`)
    doc.text(`Description: ${contract.description}`)
    doc.moveDown()
    doc.fontSize(16).text(`Prix: ${contract.price} €`, { align: 'right' })
    // --- End PDF Content ---

    doc.end()

    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        // 3. Update contract with PDF URL
        contract.pdfUrl = `tmp/uploads/contracts/${pdfFileName}`
        await contract.save()
        resolve(true)
      })
      writeStream.on('error', reject)
    })
  }

  public async scheduleContractChecks() {
    // Logic for a scheduled task to update contract statuses
  }
}
