import vine from '@vinejs/vine'

export const prestataireValidator = vine.compile(
  vine.object({
    utilisateur_id: vine.number()
  })
)
