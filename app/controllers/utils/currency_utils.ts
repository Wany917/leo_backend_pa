export class CurrencyUtils {
  static eurosToStripeAmount(euros: number): number {
    if (euros < 0) {
      throw new Error('Le montant ne peut pas être négatif')
    }
    return Math.round(euros * 100)
  }

  static stripeAmountToEuros(centimes: number): number {
    return centimes / 100
  }

  static isValidAmount(euros: number): boolean {
    return euros > 0 && euros < 999999.99 && Number.isFinite(euros)
  }

  static formatEuros(euros: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(euros)
  }
}

export function prepareStripeAmount(eurosInput: string | number): number {
  const euros = typeof eurosInput === 'string' 
    ? parseFloat(eurosInput.replace(',', '.'))
    : eurosInput

  if (isNaN(euros) || !CurrencyUtils.isValidAmount(euros)) {
    throw new Error(`Montant invalide: ${eurosInput}`)
  }

  return CurrencyUtils.eurosToStripeAmount(euros)
}

export function convertStripeAmountForDB(stripeAmount: number): number {
  return CurrencyUtils.stripeAmountToEuros(stripeAmount)
}