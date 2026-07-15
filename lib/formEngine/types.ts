export type PublicFormFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "NUMBER"
  | "PHONE"
  | "DATE"
  | "SELECT"
  | "MULTI_SELECT"
  | "RADIO"
  | "CHECKBOX"
  | "FILE";

export type PublicOptionSource = "STATIC" | "PROGRAMS" | "CAMPUSES" | "SESSIONS";

export interface FieldValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  minSelected?: number;
  maxSelected?: number;
  maxFileSizeMb?: number;
  acceptedFileTypes?: string[];
}

export interface PublicFormFieldOption {
  id: string;
  label: string;
  value: string;
  triggersFreeText: boolean;
}

export interface PublicFormField {
  id: string;
  key: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  type: PublicFormFieldType;
  isRequired: boolean;
  isSearchable: boolean;
  defaultValue: string | null;
  validationRules: FieldValidationRules | null;
  optionSource: PublicOptionSource | null;
  options: PublicFormFieldOption[];
  mapsToColumn: string | null;
  dependsOnFieldKey: string | null;
  dependsOnValue: string | null;
}

export interface PublicFormSection {
  id: string;
  key: string;
  title: string;
  description: string | null;
  fields: PublicFormField[];
}

export interface PublicFormStep {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sections: PublicFormSection[];
}

export function flattenFields(steps: PublicFormStep[]): PublicFormField[] {
  return steps.flatMap((step) => step.sections.flatMap((section) => section.fields));
}
