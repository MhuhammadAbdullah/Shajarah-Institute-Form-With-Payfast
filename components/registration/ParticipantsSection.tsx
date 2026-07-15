"use client";

import { useFieldArray, type Control, type FieldErrors } from "react-hook-form";
import { Card, CardSection } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ParticipantsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  errors: FieldErrors;
  maxParticipants: number;
}

/**
 * Renders only for Multiple Registration. Bypasses the generic dynamic
 * FormField engine entirely - customFieldValues is a flat {key: value} map,
 * not designed for repeating groups, so a dedicated component built on
 * react-hook-form's useFieldArray is cleaner than forcing this through the
 * generic renderer. See lib/formEngine/participantSchema.ts for validation.
 */
export function ParticipantsSection({ control, register, errors, maxParticipants }: ParticipantsSectionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "participants" });

  function addParticipant() {
    if (fields.length >= maxParticipants) return;
    append({ fullName: "", email: "", phone: "", cnic: "", age: "" });
  }

  const participantErrors = (errors.participants as unknown as Record<number, Record<string, { message?: string }>> | undefined) ?? {};

  return (
    <Card>
      <CardSection title="Participants" description={`Add each person being registered (up to ${maxParticipants}).`}>
        <div className="sm:col-span-2 flex flex-col gap-4">
          {fields.map((field, index) => {
            const fieldErrors = participantErrors[index] ?? {};
            return (
              <div key={field.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Participant {index + 1}</p>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Full Name" htmlFor={`participant-${index}-fullName`} error={fieldErrors.fullName?.message}>
                    <Input id={`participant-${index}-fullName`} hasError={!!fieldErrors.fullName} {...register(`participants.${index}.fullName`)} />
                  </Field>
                  <Field label="Email" htmlFor={`participant-${index}-email`} error={fieldErrors.email?.message}>
                    <Input id={`participant-${index}-email`} type="email" hasError={!!fieldErrors.email} {...register(`participants.${index}.email`)} />
                  </Field>
                  <Field label="Phone Number" htmlFor={`participant-${index}-phone`} error={fieldErrors.phone?.message}>
                    <Input id={`participant-${index}-phone`} hasError={!!fieldErrors.phone} {...register(`participants.${index}.phone`)} />
                  </Field>
                  <Field label="CNIC" htmlFor={`participant-${index}-cnic`} error={fieldErrors.cnic?.message}>
                    <Input id={`participant-${index}-cnic`} hasError={!!fieldErrors.cnic} {...register(`participants.${index}.cnic`)} />
                  </Field>
                  <Field label="Age" htmlFor={`participant-${index}-age`} error={fieldErrors.age?.message}>
                    <Input id={`participant-${index}-age`} type="number" min="1" max="120" hasError={!!fieldErrors.age} {...register(`participants.${index}.age`)} />
                  </Field>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="secondary" onClick={addParticipant} disabled={fields.length >= maxParticipants} className="self-start">
            + Add Participant
          </Button>
        </div>
      </CardSection>
    </Card>
  );
}
