"use client";

import { useActionState, useEffect } from "react";
import { saveProgramAction, type CmsFormState } from "@/actions/cms.actions";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ModalFormTrigger } from "@/components/admin/ModalFormTrigger";

interface Program {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  displayOrder: number;
}

export interface OptionRow {
  id: string;
  name: string;
}

interface ProgramFormProps {
  program?: Program;
  trigger: "create" | "edit";
  campuses: OptionRow[];
  sessions: OptionRow[];
  selectedCampusIds?: string[];
  selectedSessionIds?: string[];
}

function CheckboxGroup({ name, options, selectedIds }: { name: string; options: OptionRow[]; selectedIds: string[] }) {
  if (options.length === 0) {
    return <p className="text-xs text-slate-400">None configured yet.</p>;
  }

  return (
    <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name={name} value={option.id} defaultChecked={selectedIds.includes(option.id)} />
          {option.name}
        </label>
      ))}
    </div>
  );
}

function FormBody({
  program,
  campuses,
  sessions,
  selectedCampusIds = [],
  selectedSessionIds = [],
  onSaved,
}: ProgramFormProps & { onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState<CmsFormState, FormData>(saveProgramAction, {});

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {program && <input type="hidden" name="id" value={program.id} />}
      <Field label="Program Name" htmlFor={`program-name-${program?.id ?? "new"}`}>
        <Input id={`program-name-${program?.id ?? "new"}`} name="name" required defaultValue={program?.name} />
      </Field>
      <Field label="Description" htmlFor={`program-desc-${program?.id ?? "new"}`} optional>
        <Textarea id={`program-desc-${program?.id ?? "new"}`} name="description" rows={2} defaultValue={program?.description ?? ""} />
      </Field>
      <Field label="Thumbnail URL" htmlFor={`program-thumb-${program?.id ?? "new"}`} optional>
        <Input id={`program-thumb-${program?.id ?? "new"}`} name="thumbnailUrl" defaultValue={program?.thumbnailUrl ?? ""} />
      </Field>
      <Field label="Display Order" htmlFor={`program-order-${program?.id ?? "new"}`} optional helpText="Lower numbers appear first on the registration form. Leave blank to add at the end.">
        <Input id={`program-order-${program?.id ?? "new"}`} name="displayOrder" type="number" step="1" defaultValue={program?.displayOrder} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Campuses</p>
          <CheckboxGroup name="campusIds" options={campuses} selectedIds={selectedCampusIds} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Sessions</p>
          <CheckboxGroup name="sessionIds" options={sessions} selectedIds={selectedSessionIds} />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" variant={program ? "secondary" : "primary"} loading={isPending} className="self-start">
        {program ? "Save Changes" : "Add Program"}
      </Button>
    </form>
  );
}

export function ProgramForm(props: ProgramFormProps) {
  const isEdit = props.trigger === "edit";

  return (
    <ModalFormTrigger
      triggerLabel={isEdit ? "Edit" : "Add Program"}
      triggerVariant={isEdit ? "ghost" : "primary"}
      title={isEdit ? "Edit Program" : "Add Program"}
      widthClassName="max-w-xl"
    >
      {(close) => <FormBody {...props} onSaved={close} />}
    </ModalFormTrigger>
  );
}
