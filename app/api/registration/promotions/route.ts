import { NextResponse } from "next/server";
import { listActivePromotionsForBanner } from "@/services/promotion.service";

/**
 * Public, unauthenticated - returns only banner-eligible active promotions
 * with sanitized fields (never internal name/description/usage counts). Used
 * by components/registration/PromotionBanner.tsx on the homepage and the
 * Review & Payment step.
 */
export async function GET() {
  const promotions = await listActivePromotionsForBanner();
  return NextResponse.json({ success: true, promotions });
}
