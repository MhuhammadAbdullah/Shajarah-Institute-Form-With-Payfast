"use client";

import { useMemo } from "react";
import { Controller, type Control, type FieldErrors, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { Country, State, City } from "country-state-city";
import { Field } from "@/components/ui/Field";
import { Combobox } from "@/components/ui/Combobox";
import type { PublicFormField } from "@/lib/formEngine/types";

interface LocationCascadeFieldsProps {
  countryField: PublicFormField;
  provinceField: PublicFormField;
  cityField: PublicFormField;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  errors: FieldErrors;
}

/**
 * Country -> State/Province -> City cascade backed by the offline
 * `country-state-city` dataset - no live API calls, no hardcoded list of
 * our own. Field keys stay country/province/city so the rest of the
 * pipeline (splitSubmission, registration.service, sheets.service) needs
 * no changes: values are stored as plain names, same shape those layers
 * already expect from the generic fields this replaces.
 */
export function LocationCascadeFields({ countryField, provinceField, cityField, control, setValue, watch, errors }: LocationCascadeFieldsProps) {
  const countryName = watch(countryField.key) as string | undefined;
  const provinceName = watch(provinceField.key) as string | undefined;

  const countries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = useMemo(() => countries.find((c) => c.name === countryName), [countries, countryName]);

  const states = useMemo(() => (selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []), [selectedCountry]);
  const selectedState = useMemo(() => states.find((s) => s.name === provinceName), [states, provinceName]);

  const cities = useMemo(
    () => (selectedCountry && selectedState ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : []),
    [selectedCountry, selectedState],
  );

  const countryOptions = useMemo(() => countries.map((c) => ({ label: c.name, value: c.name })), [countries]);
  const stateOptions = useMemo(() => states.map((s) => ({ label: s.name, value: s.name })), [states]);
  const cityOptions = useMemo(() => cities.map((c) => ({ label: c.name, value: c.name })), [cities]);

  const countryError = errors[countryField.key]?.message as string | undefined;
  const provinceError = errors[provinceField.key]?.message as string | undefined;
  const cityError = errors[cityField.key]?.message as string | undefined;

  return (
    <>
      <Field
        label={countryField.label}
        htmlFor="field-country"
        optional={!countryField.isRequired}
        error={countryError}
        helpText={countryField.helpText ?? undefined}
      >
        <Controller
          name={countryField.key}
          control={control}
          render={({ field: { value, onChange, onBlur } }) => (
            <Combobox
              id="field-country"
              value={value ?? ""}
              onChange={(v) => {
                onChange(v);
                setValue(provinceField.key, "", { shouldDirty: true });
                setValue(cityField.key, "", { shouldDirty: true });
              }}
              onBlur={onBlur}
              options={countryOptions}
              placeholder="Search countries…"
              hasError={!!countryError}
            />
          )}
        />
      </Field>

      <Field
        label={provinceField.label}
        htmlFor="field-province"
        optional={!provinceField.isRequired}
        error={provinceError}
        helpText={provinceField.helpText ?? undefined}
      >
        <Controller
          name={provinceField.key}
          control={control}
          render={({ field: { value, onChange, onBlur } }) => (
            <Combobox
              id="field-province"
              value={value ?? ""}
              onChange={(v) => {
                onChange(v);
                setValue(cityField.key, "", { shouldDirty: true });
              }}
              onBlur={onBlur}
              options={stateOptions}
              placeholder={selectedCountry ? "Search states/provinces…" : "Select a country first"}
              hasError={!!provinceError}
              disabled={!selectedCountry || stateOptions.length === 0}
            />
          )}
        />
      </Field>

      <Field
        label={cityField.label}
        htmlFor="field-city"
        optional={!cityField.isRequired}
        error={cityError}
        helpText={cityField.helpText ?? undefined}
      >
        <Controller
          name={cityField.key}
          control={control}
          render={({ field: { value, onChange, onBlur } }) => (
            <Combobox
              id="field-city"
              value={value ?? ""}
              onChange={onChange}
              onBlur={onBlur}
              options={cityOptions}
              placeholder={selectedState ? "Search cities…" : "Select a state/province first"}
              hasError={!!cityError}
              disabled={!selectedState || cityOptions.length === 0}
            />
          )}
        />
      </Field>
    </>
  );
}
