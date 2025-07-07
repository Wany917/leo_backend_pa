import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'
import Contract from './contract.ts'

export default class Commercant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare storeName: string

  @column()
  declare businessAddress: string | null

  @column()
  declare contactNumber: string | null

  @column()
  declare verificationState: 'pending' | 'verified' | 'rejected'

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'id',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof Utilisateurs>

  @hasMany(() => Contract)
  declare contracts: HasMany<typeof Contract>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
