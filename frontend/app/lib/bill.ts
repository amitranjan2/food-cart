/** Rates in basis points (5% = 500), from GET /api/public/pricing. */
export type Rates = { foodGstBp: number; platformFeeBp: number; platformFeeGstBp: number };

/** The launch rates, used until the API answers (the server checks the total either way). */
export const LAUNCH_RATES: Rates = { foodGstBp: 500, platformFeeBp: 250, platformFeeGstBp: 1800 };

export type Bill = { itemTotal: number; foodGst: number; platformFee: number; platformFeeGst: number; total: number; rates: Rates };

/** amount × bp / 10000 in paise, rounded half up: the same integer sums as the API's BillRules. */
function share(paise: number, bp: number) {
  return Math.floor((paise * bp + 5000) / 10000);
}

/**
 * Items + GST on food + platform charges (a share of items + GST, for online payment charges) + GST on those
 * charges. Same sums as the API (BillRules.java), which refuses the order if the totals differ.
 */
export function billOf(itemTotal: number, rates: Rates): Bill {
  const items = Math.round(itemTotal * 100);
  const foodGst = share(items, rates.foodGstBp);
  const fee = share(items + foodGst, rates.platformFeeBp);
  const feeGst = share(fee, rates.platformFeeGstBp);
  return { itemTotal: items / 100, foodGst: foodGst / 100, platformFee: fee / 100, platformFeeGst: feeGst / 100, total: (items + foodGst + fee + feeGst) / 100, rates };
}

/** "5%", "2.5%". */
export function percent(bp: number) {
  return `${bp / 100}%`;
}
