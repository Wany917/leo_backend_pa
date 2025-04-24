import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class CodeTemporaire extends BaseModel {
  @column()
  declare user_info: string

  @column()
  declare code: string
}