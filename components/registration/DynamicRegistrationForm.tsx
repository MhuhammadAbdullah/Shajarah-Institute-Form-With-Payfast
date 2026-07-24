"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import type { PublicFormStep, PublicFormField } from "@/lib/formEngine/types";
import { buildZodSchemaForFields } from "@/lib/formEngine/buildZodSchema";
import { participantsArraySchema } from "@/lib/formEngine/participantSchema";
import { RenderField, type CmsOptionLists } from "@/lib/formEngine/renderField";
import { StepIndicator } from "@/components/registration/StepIndicator";
import { ReviewSummary } from "@/components/registration/ReviewSummary";
import { ParticipantsSection } from "@/components/registration/ParticipantsSection";
import { LocationCascadeFields } from "@/components/registration/LocationCascadeFields";
import { Card, CardSection } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PayFastRedirectForm } from "@/components/registration/PayFastRedirectForm";
import { SuccessCheckmark } from "@/components/registration/SuccessCheckmark";
import type { CheckoutFields } from "@/types/registration";
import type { AppliedPromotion, CouponError } from "@/types/promotion";

const DRAFT_STORAGE_KEY = "shajarah-registration-draft-v1";
export const LAST_BASKET_ID_KEY = "shajarah-last-basket-id";
const AUTOSAVE_DEBOUNCE_MS = 600;

interface DynamicRegistrationFormProps {
  steps: PublicFormStep[];
  cmsOptions: CmsOptionLists;
  maxParticipants: number;
  /**
   * Renders the exact same wizard for admins to preview Form Builder
   * changes - never calls /api/register or redirects to PayFast, and
   * never touches localStorage (so it can't collide with or leak a real
   * customer's in-progress draft in the same browser).
   */
  previewMode?: boolean;
}

export interface FeeDisplay {
  // Layer 1 (existing quantity-tier bulk discount) - unchanged meaning.
  unitFee: number;
  quantity: number;
  subtotal: number;
  appliedRule: { minQuantity: number; discountType: "PERCENT" | "FIXED"; value: number } | null;
  discountAmount: number;
  currency: string;
  // Layer 2 (Promotion engine) - additive.
  bulkDiscountAmount: number;
  promotionDiscountAmount: number;
  appliedPromotions: AppliedPromotion[];
  freeRegistrationCount: number;
  totalDiscountAmount: number;
  couponError: CouponError | null;
  // Redefined: now the true final payable (both layers combined).
  totalFee: number;
}

function isFieldVisible(field: PublicFormField, values: Record<string, unknown>): boolean {
  if (!field.dependsOnFieldKey) return true;
  const controllingValue = values[field.dependsOnFieldKey];
  const stringified = typeof controllingValue === "boolean" ? (controllingValue ? "true" : "false") : String(controllingValue ?? "");
  return stringified === field.dependsOnValue;
}

export function DynamicRegistrationForm({ steps, cmsOptions, maxParticipants, previewMode = false }: DynamicRegistrationFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ checkoutUrl: string; fields: CheckoutFields } | null>(null);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [feeDisplay, setFeeDisplay] = useState<FeeDisplay | null>(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [programOptions, setProgramOptions] = useState<{ campuses: string[]; sessions: string[] } | null>(null);
  const [programOptionsLoading, setProgramOptionsLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const hasSubmittedRef = useRef(false);

  const allFields = steps.flatMap((step) => step.sections.flatMap((section) => section.fields));
  const schema = buildZodSchemaForFields(allFields);
  const isLastStep = currentStepIndex === steps.length - 1;

  const fieldDefaultValues = Object.fromEntries(
    allFields.filter((field) => field.defaultValue != null).map((field) => [field.key, field.defaultValue]),
  );

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<Record<string, any>>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: {
      ...fieldDefaultValues,
      participants: [{ fullName: "", email: "", phone: "", cnic: "", age: "" }],
    },
  });

  const values = watch();

  // Resume: offer to restore a previously saved draft on first mount.
  // Skipped entirely in preview mode so an admin previewing the form can
  // never collide with (or leak) a real customer's in-progress draft.
  useEffect(() => {
    if (previewMode) return;
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) setResumeAvailable(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: debounced write of current values to localStorage. Keyed off
  // a serialized snapshot (not `values` itself, which is a new object from
  // watch() on every render) so the debounce timer only resets on real changes.
  const valuesSnapshot = JSON.stringify(values);
  useEffect(() => {
    if (previewMode) return;
    const timeout = setTimeout(() => {
      if (Object.keys(values).length > 0) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, valuesSnapshot);
        setShowSavedBadge(true);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesSnapshot]);

  // Hide the "Draft saved" badge a couple seconds after it appears.
  useEffect(() => {
    if (!showSavedBadge) return;
    const timeout = setTimeout(() => setShowSavedBadge(false), 2000);
    return () => clearTimeout(timeout);
  }, [showSavedBadge]);

  // Warn before leaving with unsaved changes (not after a successful submit/redirect).
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty && !hasSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const program = values.program;
  const campus = values.campus;
  const session = values.session;
  const isMultiple = values.registrationType === "MULTIPLE";
  const participantList = (values.participants as { fullName?: string }[] | undefined) ?? [];
  const quantity = isMultiple ? Math.max(participantList.length, 1) : 1;

  // Re-fetch the Campus/Session lists whenever the selected Program changes,
  // scoped to only what's actually associated with that Program - and clear
  // out a previously chosen Campus/Session if it's no longer valid for the
  // new Program, so a stale invalid combination can never be submitted.
  useEffect(() => {
    if (!program) {
      setProgramOptions(null);
      return;
    }

    const controller = new AbortController();
    setProgramOptionsLoading(true);
    fetch(`/api/registration/program-options?${new URLSearchParams({ program }).toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setProgramOptions({ campuses: [], sessions: [] });
          return;
        }
        setProgramOptions({ campuses: data.campuses, sessions: data.sessions });
        if (campus && !data.campuses.includes(campus)) setValue("campus", "", { shouldDirty: true });
        if (session && !data.sessions.includes(session)) setValue("session", "", { shouldDirty: true });
      })
      .catch(() => setProgramOptions({ campuses: [], sessions: [] }))
      .finally(() => setProgramOptionsLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);

  const effectiveCmsOptions: CmsOptionLists = {
    ...cmsOptions,
    campuses: programOptions ? programOptions.campuses.map((name) => ({ name })) : cmsOptions.campuses,
    sessions: programOptions ? programOptions.sessions.map((name) => ({ name })) : cmsOptions.sessions,
  };

  useEffect(() => {
    if (!program || !campus || !session) {
      setFeeDisplay(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ program, campus, session, quantity: String(quantity) });
    if (couponCode) params.set("coupon", couponCode);
    if (values.email) params.set("email", String(values.email));

    setFeeLoading(true);
    fetch(`/api/registration/fee-options?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setFeeDisplay(
          data.success
            ? {
                unitFee: data.unitFee,
                quantity: data.quantity,
                subtotal: data.subtotal,
                appliedRule: data.appliedRule,
                discountAmount: data.discountAmount,
                currency: data.currency,
                bulkDiscountAmount: data.bulkDiscountAmount,
                promotionDiscountAmount: data.promotionDiscountAmount,
                appliedPromotions: data.appliedPromotions,
                freeRegistrationCount: data.freeRegistrationCount,
                totalDiscountAmount: data.totalDiscountAmount,
                couponError: data.couponError,
                totalFee: data.totalFee,
              }
            : null,
        );
        setFeeLoading(false);
      })
      .catch((error) => {
        // A request superseded by a newer one (e.g. re-typing/re-applying a
        // coupon quickly) rejects with AbortError when its controller is
        // aborted below - that's expected and the newer request already owns
        // feeDisplay/feeLoading, so it must NOT clear them out from under it.
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeeDisplay(null);
        setFeeLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, campus, session, quantity, couponCode]);

  function handleResumeDraft() {
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        reset(JSON.parse(saved));
      } catch {
        // corrupt draft - ignore
      }
    }
    setResumeAvailable(false);
  }

  function handleDiscardDraft() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setResumeAvailable(false);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Participants bypass the generic dynamic FormField engine (see
   * ParticipantsSection.tsx), so they aren't covered by the Zod schema
   * built from `allFields` - validated separately here against the shared
   * participantSchema, with errors wired into react-hook-form's error
   * state the same way the generic resolver would.
   */
  function validateParticipants(): boolean {
    if (!isMultiple) return true;

    const result = participantsArraySchema.safeParse(values.participants ?? []);
    if (result.success) return true;

    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (path) {
        setError(`participants.${path}`, { message: issue.message });
      }
    }
    return false;
  }

  async function handleNext() {
    const currentStep = steps[currentStepIndex];
    const stepFieldKeys = currentStep.sections.flatMap((section) => section.fields.map((field) => field.key));
    const stepShowsParticipants = currentStep.sections.some((section) => section.key === "student-info");

    const fieldsValid = await trigger(stepFieldKeys);
    const participantsValid = stepShowsParticipants ? validateParticipants() : true;

    if (fieldsValid && participantsValid) {
      setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));
      setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
      scrollToTop();
    }
  }

  function handleBack() {
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
    scrollToTop();
  }

  function jumpToStep(index: number) {
    setCurrentStepIndex(index);
    scrollToTop();
  }

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null);

    if (!validateParticipants()) {
      setSubmitError("Please fix the errors in the Participants section.");
      return;
    }

    // Preview mode never reaches /api/register or PayFast - no registration
    // is created and no payment is initiated, regardless of how this is
    // triggered (double-submit, back-button, etc.).
    if (previewMode) {
      setPreviewSubmitted(true);
      return;
    }

    // `data` is the zodResolver's *parsed* output, built from the schema in
    // buildZodSchemaForFields - which only has a property per DB-defined
    // FormField. `participants` isn't a FormField (see validateParticipants
    // above), so it's absent from that shape and Zod's default "strip"
    // behavior drops it from `data` even though it's filled in on screen.
    // Re-attach it from the raw watched form state so the server (which
    // expects rawBody.participants for MULTIPLE registrations) sees it.
    // `couponCode` is likewise not a FormField - the server recomputes and
    // validates it independently regardless of what fee-options last showed.
    const payload: Record<string, unknown> = isMultiple ? { ...data, participants: values.participants } : { ...data };
    if (couponCode) payload.couponCode = couponCode;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      hasSubmittedRef.current = true;
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.sessionStorage.setItem(LAST_BASKET_ID_KEY, result.basketId);
      setCheckout({ checkoutUrl: result.checkoutUrl, fields: result.fields });
    } catch {
      setSubmitError("Unable to reach the server. Please check your connection and try again.");
    }
  }

  if (previewSubmitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <SuccessCheckmark />
        <h2 className="text-lg font-semibold text-slate-900">Preview complete</h2>
        <p className="max-w-sm text-sm text-slate-500">
          Nothing was submitted and no payment was initiated - this was a preview of the form only.
        </p>
      </div>
    );
  }

  if (checkout) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4 py-16 text-center"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-slate-600">Redirecting you to PayFast to complete your payment…</p>
        <PayFastRedirectForm checkoutUrl={checkout.checkoutUrl} fields={checkout.fields} />
      </motion.div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const isReviewStep = isLastStep;

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence>
        {resumeAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span>You have an incomplete registration saved on this device. Would you like to resume it?</span>
            <div className="flex gap-3">
              <button type="button" onClick={handleResumeDraft} className="font-semibold underline">
                Resume
              </button>
              <button type="button" onClick={handleDiscardDraft} className="text-emerald-600 underline">
                Start Fresh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <StepIndicator steps={steps} currentIndex={currentStepIndex} completedSteps={completedSteps} onJump={jumpToStep} />
        <div className="flex h-4 justify-end">
          <AnimatePresence>
            {showSavedBadge && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-xs font-medium text-emerald-600"
              >
                Draft saved
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <form
        onSubmit={isLastStep ? handleSubmit(onSubmit) : (e) => e.preventDefault()}
        className="flex flex-col gap-8"
        noValidate
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col gap-8"
          >
            {isReviewStep ? (
              <ReviewSummary
                steps={steps}
                values={values}
                onEditStep={jumpToStep}
                feeDisplay={feeDisplay}
                couponCode={couponCode}
                couponLoading={feeLoading}
                onApplyCoupon={setCouponCode}
                onRemoveCoupon={() => setCouponCode(null)}
              />
            ) : null}

            {currentStep.sections.map((section) => {
              const visibleFields = section.fields.filter((field) => isFieldVisible(field, values));
              if (visibleFields.length === 0) return null;

              return (
                <div key={section.id} className="flex flex-col gap-6">
                  <Card>
                    <CardSection title={section.title} description={section.description ?? undefined}>
                      {(() => {
                        const countryField = visibleFields.find((f) => f.key === "country");
                        const provinceField = visibleFields.find((f) => f.key === "province");
                        const cityField = visibleFields.find((f) => f.key === "city");
                        const isLocationSection = Boolean(countryField && provinceField && cityField);

                        if (isLocationSection) {
                          return (
                            <>
                              <LocationCascadeFields
                                countryField={countryField!}
                                provinceField={provinceField!}
                                cityField={cityField!}
                                control={control}
                                setValue={setValue}
                                watch={watch}
                                errors={errors}
                              />
                              {visibleFields
                                .filter((f) => f.key !== "country" && f.key !== "province" && f.key !== "city")
                                .map((field) => (
                                  <RenderField key={field.id} field={field} register={register} setValue={setValue} control={control} errors={errors} cmsOptions={effectiveCmsOptions} />
                                ))}
                            </>
                          );
                        }

                        return visibleFields.map((field) => (
                          <RenderField key={field.id} field={field} register={register} setValue={setValue} control={control} errors={errors} cmsOptions={effectiveCmsOptions} />
                        ));
                      })()}
                    </CardSection>
                    {section.key === "program-info" && programOptionsLoading && (
                      <p className="flex items-center gap-2 px-6 pb-4 text-sm text-slate-500">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                        Loading available campuses &amp; sessions…
                      </p>
                    )}
                    {section.key === "program-info" && !programOptionsLoading && feeLoading && (
                      <p className="flex items-center gap-2 px-6 pb-4 text-sm text-slate-500">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                        Calculating fee…
                      </p>
                    )}
                    {section.key === "program-info" && !programOptionsLoading && !feeLoading && feeDisplay && (
                      <p className="px-6 pb-4 text-sm font-medium text-emerald-700">
                        Fee: {feeDisplay.currency} {feeDisplay.totalFee.toLocaleString()}
                      </p>
                    )}
                  </Card>
                  {section.key === "student-info" && isMultiple && (
                    <ParticipantsSection control={control} register={register} errors={errors} maxParticipants={maxParticipants} />
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {submitError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          {currentStepIndex > 0 ? (
            <Button type="button" variant="secondary" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <span />
          )}

          {isLastStep ? (
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!values.agreementAccepted || !values.privacyAccepted}
              title={!values.agreementAccepted || !values.privacyAccepted ? "Please accept the Terms & Conditions and Privacy Policy to continue" : undefined}
            >
              {isSubmitting ? "Processing…" : "Proceed to Payment"}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
