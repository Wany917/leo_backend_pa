import vine from '@vinejs/vine'

// Validator pour création d'assurance colis
export const createInsuranceValidator = vine.compile(
  vine.object({
    colis_id: vine.number().positive(),
    annonce_id: vine.number().positive(),
    coverage_amount: vine.number().positive().max(10000), // Max 10k€
    covered_items: vine.string().maxLength(1000),
    start_date: vine.string(), // ISO date
    end_date: vine.string(), // ISO date
  })
)

// Validator pour déclaration de sinistre
export const createClaimValidator = vine.compile(
  vine.object({
    insurance_id: vine.number().positive(),
    claim_description: vine.string().minLength(10).maxLength(2000),
    claim_amount: vine.number().positive(),
    evidence_files: vine.array(vine.string()).optional(), // Paths des fichiers
  })
)

// Validator pour traitement admin de sinistre
export const processClaimValidator = vine.compile(
  vine.object({
    claim_status: vine.enum(['approved', 'rejected']),
    admin_notes: vine.string().maxLength(1000).optional(),
    approved_amount: vine.number().positive().optional(),
  })
) 