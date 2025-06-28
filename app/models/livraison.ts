import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'
import Colis from '#models/colis'
import Livreur from '#models/livreur'
import Client from '#models/client'
import Annonce from '#models/annonce'
import HistoriqueLivraison from '#models/historique_livraison'
import Ws from '#services/ws'

export default class Livraison extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'livreur_id' })
  declare livreurId: number | null

  @column({ columnName: 'client_id' })
  declare clientId: number | null

  @column({ columnName: 'annonce_id' })
  declare annonceId: number | null

  @column()
  declare pickupLocation: string

  @column()
  declare dropoffLocation: string

  @column()
  declare status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

  @column()
  declare price: number | null

  @column.dateTime()
  declare deliveredAt: DateTime | null

  @belongsTo(() => Livreur, {
    foreignKey: 'livreurId',
    localKey: 'id',
  })
  declare livreur: BelongsTo<typeof Livreur>

  @belongsTo(() => Client, {
    foreignKey: 'clientId',
    localKey: 'id',
  })
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Annonce, {
    foreignKey: 'annonceId',
    localKey: 'id',
  })
  declare annonce: BelongsTo<typeof Annonce>

  @manyToMany(() => Colis, {
    pivotTable: 'livraison_colis',
    pivotForeignKey: 'livraison_id',
    pivotRelatedForeignKey: 'colis_id',
  })
  declare colis: ManyToMany<typeof Colis>

  @hasMany(() => HistoriqueLivraison, {
    foreignKey: 'livraisonId',
    localKey: 'id',
  })
  declare historique: HasMany<typeof HistoriqueLivraison>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Notifier les livreurs disponibles d'une nouvelle livraison
   */
  async notifyNewDelivery() {
    const io = Ws.io
    if (!io) return

    // Charger les colis associés pour avoir plus d'infos
    await this.load('colis' as any)

    // Notifier tous les livreurs disponibles
    const availableLivreurs = await Livreur.query().where('availabilityStatus', 'available')

    const notification = {
      livraison: {
        id: this.id,
        pickupLocation: this.pickupLocation,
        dropoffLocation: this.dropoffLocation,
        status: this.status,
        price: this.price,
        createdAt: this.createdAt.toISO(),
        colisCount: this.colis?.length || 0,
      },
    }

    // Émettre à tous les livreurs disponibles
    io.emit('new_delivery_available', notification)

    console.log(`Nouvelle livraison ${this.id} notifiée à ${availableLivreurs.length} livreurs`)
  }
}
