import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'

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
  declare verification_status: string

  @column.dateTime({ autoCreate: true })
  declare uploaded_at: DateTime

  @column.dateTime()
  declare verified_at: DateTime | null

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'utilisateur_id',
  })
  declare utilisateur: BelongsTo<typeof Utilisateurs>
}
