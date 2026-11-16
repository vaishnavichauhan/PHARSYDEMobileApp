/**
 * Tax Calculator Utility (Mobile)
 * Matches Pharsyde Web Frontend (Frontend/src/utils/taxCalculator.js)
 * and Backend (Backend/utils/taxCalculator.js):
 * - Cannabis products: 5% GST (PST exempt in Manitoba) = 5% Total
 * - Nicotine products: 5% GST + 7% PST = 12% Total
 * - Accessories & other: 5% GST + 7% PST = 12% Total
 *
 * Supports proportional discount allocation (loyalty rewards / promo codes).
 */

import { classifyProduct } from './cannabisLimit';

export const TAX_RATES = {
  CANNABIS: {
    gst: 0.05,
    pst: 0.00,
    total: 0.05,
  },
  NICOTINE: {
    gst: 0.05,
    pst: 0.07,
    total: 0.12,
  },
  ACCESSORY: {
    gst: 0.05,
    pst: 0.00,
    total: 0.05,
  },
  DEFAULT: {
    gst: 0.05,
    pst: 0.00,
    total: 0.05,
  },
};

export interface TaxSummary {
  rawSubtotal: number;
  discount: number;
  discountedSubtotal: number;
  cannabisSubtotal: number;
  nicotineSubtotal: number;
  accessorySubtotal: number;
  cannabisTax: number;
  cannabisGst: number;
  cannabisPst: number;
  nicotineTax: number;
  nicotineGst: number;
  nicotinePst: number;
  accessoryTax: number;
  accessoryGst: number;
  accessoryPst: number;
  gst: number;
  pst: number;
  totalTax: number;
  shipping: number;
  finalTotal: number;
  hasCannabis: boolean;
  hasNicotine: boolean;
  hasAccessory: boolean;
  taxLabel: string;
}

export function calculateCartTaxes(
  items: any[] = [],
  { discount = 0, shipping = 0 }: { discount?: number; shipping?: number } = {},
): TaxSummary {
  let cannabisSubtotal = 0;
  let nicotineSubtotal = 0;
  let accessorySubtotal = 0;

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(
      0,
      Number(
        item.variant?.price ??
          item.unit_price ??
          item.price ??
          item.product?.retail_price ??
          item.product?.price ??
          0,
      ),
    );
    const lineTotal = unitPrice * qty;

    const classification = classifyProduct(item.product || item);
    if (classification === 'nicotine') {
      nicotineSubtotal += lineTotal;
    } else if (classification === 'accessory') {
      accessorySubtotal += lineTotal;
    } else {
      cannabisSubtotal += lineTotal;
    }
  }

  const rawSubtotal = cannabisSubtotal + nicotineSubtotal + accessorySubtotal;
  const numDiscount = Math.max(0, Number(discount) || 0);
  const discountedSubtotal = Math.max(0, rawSubtotal - numDiscount);

  // Proportional discount ratio across all items
  const discountRatio = rawSubtotal > 0 ? discountedSubtotal / rawSubtotal : 1;

  // Cannabis: 5% GST + 0% PST
  const cannabisGst = Math.round(cannabisSubtotal * discountRatio * TAX_RATES.CANNABIS.gst * 100) / 100;
  const cannabisPst = 0;
  const cannabisTax = cannabisGst;

  // Nicotine: 5% GST + 7% PST = 12%
  const nicotineGst = Math.round(nicotineSubtotal * discountRatio * TAX_RATES.NICOTINE.gst * 100) / 100;
  const nicotinePst = Math.round(nicotineSubtotal * discountRatio * TAX_RATES.NICOTINE.pst * 100) / 100;
  const nicotineTax = Math.round((nicotineGst + nicotinePst) * 100) / 100;

  // Accessories: 5% GST + 7% PST = 12%
  const accessoryGst = Math.round(accessorySubtotal * discountRatio * TAX_RATES.ACCESSORY.gst * 100) / 100;
  const accessoryPst = Math.round(accessorySubtotal * discountRatio * TAX_RATES.ACCESSORY.pst * 100) / 100;
  const accessoryTax = Math.round((accessoryGst + accessoryPst) * 100) / 100;

  const totalGst = Math.round((cannabisGst + nicotineGst + accessoryGst) * 100) / 100;
  const totalPst = Math.round((cannabisPst + nicotinePst + accessoryPst) * 100) / 100;
  const totalTax = Math.round((totalGst + totalPst) * 100) / 100;

  const numShipping = Math.max(0, Number(shipping) || 0);
  const finalTotal = Math.max(0, Math.round((discountedSubtotal + totalTax + numShipping) * 100) / 100);

  const hasCannabis = cannabisSubtotal > 0;
  const hasNicotine = nicotineSubtotal > 0;
  const hasAccessory = accessorySubtotal > 0;

  // Matching Web Frontend CartDrawer.jsx & CheckoutPage.jsx label rule
  let taxLabel = 'Cannabis Tax (5% GST)';
  if (hasCannabis && hasNicotine) {
    taxLabel = 'Estimated Taxes (5% Cannabis / 12% Nicotine)';
  } else if (hasNicotine) {
    taxLabel = 'Nicotine Tax (5% GST + 7% PST = 12%)';
  } else {
    taxLabel = 'Cannabis Tax (5% GST)';
  }

  return {
    rawSubtotal: Math.round(rawSubtotal * 100) / 100,
    discount: Math.round(numDiscount * 100) / 100,
    discountedSubtotal: Math.round(discountedSubtotal * 100) / 100,
    cannabisSubtotal: Math.round(cannabisSubtotal * 100) / 100,
    nicotineSubtotal: Math.round(nicotineSubtotal * 100) / 100,
    accessorySubtotal: Math.round(accessorySubtotal * 100) / 100,
    cannabisTax,
    cannabisGst,
    cannabisPst,
    nicotineTax,
    nicotineGst,
    nicotinePst,
    accessoryTax,
    accessoryGst,
    accessoryPst,
    gst: totalGst,
    pst: totalPst,
    totalTax,
    shipping: Math.round(numShipping * 100) / 100,
    finalTotal,
    hasCannabis,
    hasNicotine,
    hasAccessory,
    taxLabel,
  };
}
