import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Prestataire from '#models/prestataire'
import Client from '#models/client'
import Annonce from '#models/annonce'

export default class Service extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'prestataireId' })
  declare prestataireId: number

  @column()
  declare clientId: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare price: number

  @column.dateTime()
  declare start_date: DateTime

  @column.dateTime()
  declare end_date: DateTime

  @column()
  declare location: string

  @column()
  declare status: string

  @column()
  declare service_type_id: number | null

  @column()
  declare duration: number | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @belongsTo(() => Prestataire, { foreignKey: 'prestataireId' })
  declare prestataire: BelongsTo<typeof Prestataire>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @manyToMany(() => Annonce, {
    pivotTable: 'annonce_services',
    pivotForeignKey: 'service_id',
    pivotRelatedForeignKey: 'annonce_id',
  })
  declare annonces: ManyToMany<typeof Annonce>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
