import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from './utilisateurs.js'

export default class JustificationPiece extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare utilisateur_id: number

  @column()
  declare document_type: string

  @column()
  declare file_path: string

  @column()
  declare account_type: string

  @column()
  declare verification_status: 'pending' | 'verified' | 'rejected'

  @column.dateTime()
  declare uploaded_at: DateTime | null

  @column.dateTime()
  declare verified_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'utilisateur_id',
  })
  declare utilisateur: BelongsTo<typeof Utilisateurs>
}
