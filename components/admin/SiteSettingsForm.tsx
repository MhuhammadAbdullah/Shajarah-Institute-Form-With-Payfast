"use client";

import { useActionState } from "react";
import { saveSiteSettingsAction, type SiteSettingFormState } from "@/actions/siteSetting.actions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function SiteSettingsForm({ maxParticipants }: { maxParticipants: number }) {
  const [state, formAction, isPending] = useActionState<SiteSettingFormState, FormData>(saveSiteSettingsAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="Maximum Participants (Multiple Registration)"
        htmlFor="maxParticipants"
        helpText="The highest number of participant cards a customer can add in one Multiple Registration."
      >
        <Input id="maxParticipants" name="maxParticipants" type="number" min={1} required defaultValue={maxParticipants} className="max-w-32" />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm font-medium text-emerald-700">Saved.</p>}

      <Button type="submit" loading={isPending} className="self-start">
        Save Settings
      </Button>
    </form>
  );
}
