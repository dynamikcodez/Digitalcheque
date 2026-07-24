/**
 * Calculates platform fee based on settings.
 * fee_amount = round(amount * platform_settings.fee_percentage/100 + platform_settings.fee_fixed)
 * total_charged = amount + fee_amount
 */
export function calculatePlatformFee(
  amount: number,
  feePercentage: number = 3.0,
  feeFixed: number = 200
) {
  const feeAmount = Math.round(amount * (feePercentage / 100) + feeFixed);
  const totalCharged = amount + feeAmount;
  return { feeAmount, totalCharged };
}

/**
 * Estimates Paystack's collection fee for Nigeria local NGN card transactions:
 * 3.0% + ₦200 (waived for transaction under ₦2,500). Capped at ₦2,000.
 */
export function estimatePaystackCollectionFee(totalCharged: number): number {
  let fee = totalCharged * 0.03;
  if (totalCharged >= 2500) {
    fee += 200;
  }
  return Math.round(Math.min(2000, fee));
}

/**
 * Estimates Paystack's transfer fee based on payout bands:
 * - Amount <= ₦5,000: ₦10
 * - Amount ₦5,001 - ₦50,000: ₦25
 * - Amount > ₦50,000: ₦50
 */
export function estimatePaystackTransferFee(amount: number): number {
  if (amount <= 5000) {
    return 10;
  } else if (amount <= 50000) {
    return 25;
  } else {
    return 50;
  }
}

/**
 * Estimates Stamp Duty:
 * ₦50 on transfers >= ₦10,000.
 */
export function estimateStampDuty(amount: number): number {
  return amount >= 10000 ? 50 : 0;
}
