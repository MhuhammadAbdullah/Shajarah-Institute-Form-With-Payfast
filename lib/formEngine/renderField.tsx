"use client";

import { useState, type ChangeEvent } from "react";
import { Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import type { PublicFormField } from "@/lib/formEngine/types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Combobox } from "@/components/ui/Combobox";
import { cn } from "@/utils/cn";

export interface CmsOptionLists {
  programs: { name: string }[];
  campuses: { name: string }[];
  sessions: { name: string }[];
}

function optionsForField(field: PublicFormField, cmsOptions: CmsOptionLists): { label: string; value: string }[] {
  switch (field.optionSource) {
    case "PROGRAMS":
      return cmsOptions.programs.map((p) => ({ label: p.name, value: p.name }));
    case "CAMPUSES":
      return cmsOptions.campuses.map((c) => ({ label: c.name, value: c.name }));
    case "SESSIONS":
      return cmsOptions.sessions.map((s) => ({ label: s.name, value: s.name }));
    default:
      return field.options.map((o) => ({ label: o.label, value: o.value }));
  }
}

interface RenderFieldProps {
  field: PublicFormField;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  errors: FieldErrors;
  cmsOptions: CmsOptionLists;
}

export function RenderField({ field, register, setValue, control, errors, cmsOptions }: RenderFieldProps) {
  const error = errors[field.key]?.message as string | undefined;
  const htmlId = `field-${field.key}`;

  switch (field.type) {
    case "TEXTAREA":
      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Textarea id={htmlId} rows={3} placeholder={field.placeholder ?? undefined} hasError={!!error} {...register(field.key)} />
        </Field>
      );

    case "SELECT": {
      const options = optionsForField(field, cmsOptions);

      if (field.isSearchable) {
        return (
          <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
            <Controller
              name={field.key}
              control={control}
              render={({ field: { value, onChange, onBlur } }) => (
                <Combobox
                  id={htmlId}
                  value={value ?? ""}
                  onChange={onChange}
                  onBlur={onBlur}
                  options={options}
                  placeholder={field.placeholder ?? "Search…"}
                  hasError={!!error}
                />
              )}
            />
          </Field>
        );
      }

      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Select id={htmlId} placeholder={field.placeholder ?? "Select…"} hasError={!!error} {...register(field.key)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    }

    case "RADIO": {
      const options = optionsForField(field, cmsOptions);
      return (
        <SelectablePillGroup
          type="radio"
          field={field}
          options={options}
          error={error}
          register={register}
          htmlId={htmlId}
        />
      );
    }

    case "MULTI_SELECT": {
      const options = optionsForField(field, cmsOptions);
      return (
        <SelectablePillGroup
          type="checkbox"
          field={field}
          options={options}
          error={error}
          register={register}
          htmlId={htmlId}
        />
      );
    }

    case "CHECKBOX":
      return (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500" {...register(field.key)} />
            <span>{field.label}</span>
          </label>
          {field.helpText && <p className="ml-7 text-xs text-slate-500">{field.helpText}</p>}
          {error && <p className="ml-7 text-sm text-red-600">{error}</p>}
        </div>
      );

    case "FILE":
      return (
        <FileUploadField
          field={field}
          htmlId={htmlId}
          error={error}
          onUploaded={(url) => setValue(field.key, url, { shouldValidate: true, shouldDirty: true })}
        />
      );

    case "NUMBER":
      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Input id={htmlId} type="number" placeholder={field.placeholder ?? undefined} hasError={!!error} {...register(field.key)} />
        </Field>
      );

    case "DATE":
      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Input id={htmlId} type="date" hasError={!!error} {...register(field.key)} />
        </Field>
      );

    case "EMAIL":
      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Input id={htmlId} type="email" placeholder={field.placeholder ?? undefined} hasError={!!error} {...register(field.key)} />
        </Field>
      );

    case "PHONE": {
      const { onChange, ...registered } = register(field.key);
      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Input
            id={htmlId}
            type="tel"
            inputMode="numeric"
            placeholder={field.placeholder ?? "03001234567"}
            hasError={!!error}
            {...registered}
            onChange={(e) => {
              e.target.value = formatPakistaniPhone(e.target.value);
              return onChange(e);
            }}
          />
        </Field>
      );
    }

    case "TEXT":
    default:
      return (
        <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error} helpText={field.helpText ?? undefined}>
          <Input id={htmlId} placeholder={field.placeholder ?? undefined} hasError={!!error} {...register(field.key)} />
        </Field>
      );
  }
}

/**
 * Radio/checkbox options rendered as selectable pill-style cards instead of
 * bare native inputs. Grouped inputs don't correctly associate with a single
 * `<label htmlFor>` (Field's normal wrapper), so this uses a proper
 * `<fieldset>`/`<legend>` pair styled to match Field's label typography -
 * the native inputs are still real (visually hidden via `sr-only`, not
 * `display: none`) so they stay keyboard-navigable and screen-reader
 * announced, and still register/validate through react-hook-form exactly
 * as before.
 */
function SelectablePillGroup({
  type,
  field,
  options,
  error,
  register,
  htmlId,
}: {
  type: "radio" | "checkbox";
  field: PublicFormField;
  options: { label: string; value: string }[];
  error: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  htmlId: string;
}) {
  const errorId = `${htmlId}-error`;

  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium text-slate-700">
        {field.label}
        {!field.isRequired && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const inputId = `${htmlId}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={inputId}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors",
                "has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500/40",
                error ? "border-red-300" : "border-slate-300 hover:border-emerald-300",
              )}
            >
              <input id={inputId} type={type} value={o.value} className="sr-only" {...register(field.key)} />
              {o.label}
            </label>
          );
        })}
      </div>
      {field.helpText && !error && <p className="text-xs text-slate-500">{field.helpText}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Live-formats a Pakistani mobile number as the user types: 03XX-XXXXXXX. */
function formatPakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/**
 * Uploads immediately on file selection (rather than at final submit) so
 * the autosaved draft only ever holds the resulting URL - never a raw File
 * object, which localStorage can't serialize.
 */
function FileUploadField({
  field,
  htmlId,
  error,
  onUploaded,
}: {
  field: PublicFormField;
  htmlId: string;
  error: string | undefined;
  onUploaded: (url: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setUploadError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setStatus("error");
        setUploadError(result.error ?? "Upload failed");
        return;
      }

      onUploaded(result.url);
      setStatus("done");
    } catch {
      setStatus("error");
      setUploadError("Unable to reach the server");
    }
  }

  return (
    <Field label={field.label} htmlFor={htmlId} optional={!field.isRequired} error={error ?? uploadError ?? undefined} helpText={field.helpText ?? undefined}>
      <input id={htmlId} type="file" onChange={handleChange} className="text-sm text-slate-600" />
      {status === "uploading" && (
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
          Uploading {fileName}…
        </p>
      )}
      {status === "done" && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          Uploaded {fileName}
        </p>
      )}
    </Field>
  );
}
