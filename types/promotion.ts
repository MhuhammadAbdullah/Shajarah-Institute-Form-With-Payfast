export type PromotionDiscountKind = "PERCENT" | "FIXED" | "BOGO";

/** One promotion that actually applied to a computed price, for display/audit. */
export interface AppliedPromotion {
  promotionId: string;
  name: string;
  publicTitle: string | null;
  code: string | null;
  discountType: PromotionDiscountKind;
  discountAmount: number;
  freeCount?: number;
}

export type CouponIneligibleReason =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USAGE_LIMIT_REACHED"
  | "USER_USAGE_LIMIT_REACHED"
  | "PROGRAM_NOT_ELIGIBLE"
  | "SESSION_NOT_ELIGIBLE"
  | "MIN_REGISTRATION_COUNT"
  | "MIN_ORDER_AMOUNT"
  | "BOGO_MIN_QUANTITY_NOT_MET";

export interface CouponError {
  reason: CouponIneligibleReason;
  message: string;
}

/** Public, banner-eligible promotion fields only - never internal name/description/usage counts. */
export interface PublicPromotion {
  id: string;
  publicTitle: string | null;
  subtitle: string | null;
  bannerText: string | null;
  requiresCode: boolean;
  code: string | null;
  discountType: PromotionDiscountKind;
  value: number | null;
  buyQuantity: number | null;
  freeQuantity: number | null;
  isFeatured: boolean;
  bannerColor: string | null;
  bannerIcon: string | null;
  endDate: string | null;
}
