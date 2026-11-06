/**
 * Cannabis Legal Purchase Limit Utility (Mobile)
 * Canadian Cannabis Act & Manitoba Provincial Law:
 * Max 30.0 grams of dried cannabis equivalent (DFE) per transaction.
 */

export const MAX_CANNABIS_GRAMS = 30.0;

export const NICOTINE_CATEGORIES = new Set([
  'nicotine closed pods',
  'nicotine e-juice',
  'nicotine vapes',
  'vapes & e-juices',
  'nicotine pouches/snus',
  'vaping accessories',
]);

export const ACCESSORY_CATEGORIES = new Set([
  'smoking accessories',
  'lighters',
  'accessories',
  'vapping accessories',
  'vaping accessories',
]);

/**
 * Classify product or line item into 'nicotine' | 'cannabis' | 'accessory'
 */
export function classifyProduct(item: any): 'nicotine' | 'cannabis' | 'accessory' {
  if (!item) return 'cannabis';

  const category = String(
    item.category ||
    item.subCategory ||
    item.other_category ||
    item.product?.category ||
    item.product?.subCategory ||
    item.product?.other_category ||
    ''
  ).trim().toLowerCase();

  const productName = String(
    item.product_name ||
    item.name ||
    item.product?.name ||
    item.product?.product_name ||
    ''
  ).trim().toLowerCase();

  // 1. Explicit Nicotine check
  if (
    NICOTINE_CATEGORIES.has(category) ||
    category.includes('nicotine') ||
    productName.includes('nicotine') ||
    productName.includes('closed pods') ||
    productName.includes('e-juice')
  ) {
    return 'nicotine';
  }

  // 2. Explicit Accessory check
  if (
    ACCESSORY_CATEGORIES.has(category) ||
    category.includes('accessory') ||
    category.includes('lighter')
  ) {
    return 'accessory';
  }

  // 3. Check isCannabis flags if available
  const rawIsCannabis =
    item.isCannabis !== undefined
      ? item.isCannabis
      : item.is_cannabis !== undefined
      ? item.is_cannabis
      : item.product?.isCannabis !== undefined
      ? item.product?.isCannabis
      : item.product?.is_cannabis;

  if (rawIsCannabis === false || rawIsCannabis === 'false' || rawIsCannabis === 0) {
    if (category.includes('accessory') || category.includes('lighter')) {
      return 'accessory';
    }
    return 'nicotine';
  }

  // Default to cannabis
  return 'cannabis';
}

/**
 * Extract dried cannabis equivalent grams (DFE) from a product or cart item
 * @param item - Product or cart item
 * @returns Grams equivalent (0 for nicotine/accessories)
 */
export function getProductCannabisGrams(item: any): number {
  if (!item) return 0.0;

  // 1. Immediately return 0 for non-cannabis items (Nicotine, Accessories)
  const classification = classifyProduct(item);
  if (classification !== 'cannabis') {
    return 0.0;
  }

  // 2. Check official equivalent_g or dfe properties
  const rawEq =
    item.equivalent_g !== undefined && item.equivalent_g !== null
      ? item.equivalent_g
      : item.dfe !== undefined && item.dfe !== null
      ? item.dfe
      : item.product?.equivalent_g !== undefined && item.product?.equivalent_g !== null
      ? item.product?.equivalent_g
      : item.product?.dfe;

  if (rawEq !== undefined && rawEq !== null && rawEq !== '') {
    const parsed = Number(rawEq);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
  }

  // 3. Check multipack pattern in name or size (e.g. "10 x 0.35g" or "10x0.35g" or "3x0.5g")
  const searchString = `${item.product_name || item.name || item.product?.name || item.product?.product_name || ''} ${item.size || item.weight || item.product?.size || item.variant?.label || ''}`;
  const multiMatch = searchString.match(/(\d+)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)\s*g\b/i);
  if (multiMatch) {
    const count = parseInt(multiMatch[1], 10);
    const weightEach = parseFloat(multiMatch[2]);
    if (Number.isFinite(count) && Number.isFinite(weightEach) && count > 0 && weightEach > 0) {
      return Math.round(count * weightEach * 100) / 100;
    }
  }

  // 4. Check single gram pattern (e.g. "3.5g", "7g", "14g", "28g", "0.5g", "1g")
  const singleMatch = searchString.match(/\b(\d+(?:\.\d+)?)\s*g\b/i);
  if (singleMatch) {
    const grams = parseFloat(singleMatch[1]);
    if (Number.isFinite(grams) && grams > 0) {
      return Math.round(grams * 100) / 100;
    }
  }

  // 5. Default fallback for cannabis products where exact weight is unspecified
  return 1.0;
}

/**
 * Format product weight/grams for display on ProductCard or Cart item
 * e.g. "14.00g eq.", "3.5g", "1.0g", "10x0.35g"
 */
export function getProductWeightDisplay(item: any): string | null {
  if (!item) return null;

  const classification = classifyProduct(item);
  if (classification !== 'cannabis') {
    return null;
  }

  // 1. If equivalent_g is provided (highest fidelity matching web / API)
  const rawEq =
    item.equivalent_g !== undefined && item.equivalent_g !== null
      ? item.equivalent_g
      : item.product?.equivalent_g;

  if (rawEq !== undefined && rawEq !== null && rawEq !== '') {
    const parsed = Number(rawEq);
    if (Number.isFinite(parsed) && parsed > 0) {
      return `${parsed.toFixed(2)}g eq.`;
    }
  }

  // 2. If explicit size or weight field provided
  const explicitSize = item.size || item.weight || item.product?.size || item.product?.weight;
  if (explicitSize && typeof explicitSize === 'string' && explicitSize.trim()) {
    const trimmed = explicitSize.trim();
    if (/\d+\s*g/i.test(trimmed)) {
      return trimmed;
    }
  }

  // 3. Check multipack pattern in product name
  const name =
    item.product_name ||
    item.name ||
    item.product?.product_name ||
    item.product?.name ||
    '';
  const multiMatch = name.match(/(\d+)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)\s*g\b/i);
  if (multiMatch) {
    return `${multiMatch[1]}x${multiMatch[2]}g`;
  }

  // 4. Check single gram pattern in product name
  const singleMatch = name.match(/\b(\d+(?:\.\d+)?)\s*g\b/i);
  if (singleMatch) {
    return `${parseFloat(singleMatch[1])}g`;
  }

  // 5. Default fallback for cannabis: show extracted grams
  const grams = getProductCannabisGrams(item);
  if (grams > 0) {
    return `${grams.toFixed(1)}g eq.`;
  }

  return null;
}

/**
 * Calculate total cannabis grams in a collection of cart items
 */
export function calculateCartCannabisGrams(items: any[] = []): number {
  if (!Array.isArray(items) || items.length === 0) return 0.0;

  let totalGrams = 0;
  for (const item of items) {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const target = item.product || item;
    const gramsPerUnit = getProductCannabisGrams(target);
    totalGrams += gramsPerUnit * qty;
  }

  return Math.round(totalGrams * 100) / 100;
}

/**
 * Validate order items against the cannabis purchase limit
 */
export function validateCannabisLimit(
  items: any[] = [],
  maxLimit: number = MAX_CANNABIS_GRAMS,
) {
  const effectiveMax = Number(maxLimit) > 0 ? Number(maxLimit) : MAX_CANNABIS_GRAMS;
  const totalGrams = calculateCartCannabisGrams(items);
  const valid = totalGrams <= effectiveMax;
  const excessGrams = valid ? 0 : Math.round((totalGrams - effectiveMax) * 100) / 100;
  const remainingGrams = valid ? Math.round((effectiveMax - totalGrams) * 100) / 100 : 0;
  const progressPercent = Math.min(100, Math.round((totalGrams / effectiveMax) * 100));

  return {
    valid,
    totalGrams,
    maxGrams: effectiveMax,
    excessGrams,
    remainingGrams,
    progressPercent,
    message: valid
      ? null
      : `Order exceeds the ${effectiveMax.toFixed(1)}g legal limit for cannabis products. Current total: ${totalGrams.toFixed(1)}g (Limit: ${effectiveMax.toFixed(1)}g). Please reduce items to checkout.`,
  };
}

