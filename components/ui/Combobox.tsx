"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/utils/cn";

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: ComboboxOption[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}

/**
 * Hand-rolled searchable dropdown - filtered text input + a listbox
 * popover, arrow-key navigation, Escape/click-outside to close. No new
 * dependency: this codebase has consistently avoided UI-kit libraries, and
 * the interaction surface here is simple enough not to need one.
 */
export function Combobox({ id, value, onChange, onBlur, options, placeholder, hasError, disabled }: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = isOpen ? query : (selectedOption?.label ?? "");

  const filtered = isOpen
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : options.slice(0, 50);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) selectOption(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={id ? `${id}-listbox` : undefined}
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors",
          "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500",
          hasError ? "border-red-400" : "border-slate-300",
          disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
        )}
      />
      {isOpen && !disabled && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {filtered.length === 0 && <li className="px-3.5 py-2 text-slate-400">No matches</li>}
          {filtered.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
              className={cn(
                "cursor-pointer px-3.5 py-2",
                index === activeIndex ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50",
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
