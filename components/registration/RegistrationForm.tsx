"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registrationSchema,
  type RegistrationFormInput,
  type RegistrationFormValues,
} from "@/validators/registration.schema";
import { BATCHES, CAMPUSES, COUNTRIES, GENDERS, PROGRAM_FEES, PROGRAMS, SESSIONS } from "@/constants/programs";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { PayFastRedirectForm } from "@/components/registration/PayFastRedirectForm";
import type { CheckoutFields } from "@/types/registration";

export function RegistrationForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ checkoutUrl: string; fields: CheckoutFields } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormInput, unknown, RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      agreementAccepted: false,
    },
  });

  const selectedProgram = watch("program");
  const displayedFee = selectedProgram ? PROGRAM_FEES[selectedProgram] : undefined;

  async function onSubmit(values: RegistrationFormValues) {
    setSubmitError(null);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setCheckout({ checkoutUrl: data.checkoutUrl, fields: data.fields });
    } catch {
      setSubmitError("Unable to reach the server. Please check your connection and try again.");
    }
  }

  if (checkout) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-slate-600">Redirecting you to PayFast to complete your payment…</p>
        <PayFastRedirectForm checkoutUrl={checkout.checkoutUrl} fields={checkout.fields} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
      <Card>
        <CardSection title="Student Information" description="Tell us a bit about the applicant.">
          <Field label="Full Name" htmlFor="studentName" error={errors.studentName?.message}>
            <Input id="studentName" hasError={!!errors.studentName} {...register("studentName")} />
          </Field>
          <Field label="Father Name" htmlFor="fatherName" optional error={errors.fatherName?.message}>
            <Input id="fatherName" hasError={!!errors.fatherName} {...register("fatherName")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" hasError={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Phone Number" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" placeholder="03001234567" hasError={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label="CNIC" htmlFor="cnic" optional error={errors.cnic?.message}>
            <Input id="cnic" placeholder="42101-1234567-1" hasError={!!errors.cnic} {...register("cnic")} />
          </Field>
          <Field label="Gender" htmlFor="gender" error={errors.gender?.message}>
            <Select id="gender" placeholder="Select gender" hasError={!!errors.gender} {...register("gender")}>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender.charAt(0) + gender.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date of Birth" htmlFor="dateOfBirth" optional error={errors.dateOfBirth?.message}>
            <Input id="dateOfBirth" type="date" hasError={!!errors.dateOfBirth} {...register("dateOfBirth")} />
          </Field>
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Program Information" description="Choose the program you wish to enroll in.">
          <Field label="Program" htmlFor="program" error={errors.program?.message}>
            <Select id="program" placeholder="Select program" hasError={!!errors.program} {...register("program")}>
              {PROGRAMS.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Batch" htmlFor="batch" error={errors.batch?.message}>
            <Select id="batch" placeholder="Select batch" hasError={!!errors.batch} {...register("batch")}>
              {BATCHES.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Campus" htmlFor="campus" error={errors.campus?.message}>
            <Select id="campus" placeholder="Select campus" hasError={!!errors.campus} {...register("campus")}>
              {CAMPUSES.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Session" htmlFor="session" error={errors.session?.message}>
            <Select id="session" placeholder="Select session" hasError={!!errors.session} {...register("session")}>
              {SESSIONS.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fee (PKR)" htmlFor="fee">
            <Input
              id="fee"
              readOnly
              disabled
              value={displayedFee ? displayedFee.toLocaleString() : "Select a program"}
            />
          </Field>
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Address" description="Where can we reach you by mail?">
          <Field label="Country" htmlFor="country" error={errors.country?.message}>
            <Select id="country" placeholder="Select country" hasError={!!errors.country} {...register("country")}>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City" htmlFor="city" error={errors.city?.message}>
            <Input id="city" hasError={!!errors.city} {...register("city")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address" error={errors.address?.message}>
              <Textarea id="address" rows={3} hasError={!!errors.address} {...register("address")} />
            </Field>
          </div>
        </CardSection>
      </Card>

      <Card>
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
            {...register("agreementAccepted")}
          />
          <span>
            I confirm that the information provided is accurate and I agree to Shajarah Institute&apos;s terms,
            conditions, and refund policy.
          </span>
        </label>
        {errors.agreementAccepted && (
          <p className="mt-2 text-sm text-red-600">{errors.agreementAccepted.message}</p>
        )}
      </Card>

      {submitError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button type="submit" loading={isSubmitting} className="self-start">
        {isSubmitting ? "Processing…" : "Proceed to Payment"}
      </Button>
    </form>
  );
}
