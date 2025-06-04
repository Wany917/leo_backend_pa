import vine from '@vinejs/vine'

export const createJustificationPieceValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number(),
    document_type: vine.string().minLength(1),
  })
)
