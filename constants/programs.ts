export const PROGRAMS = [
  "Hifz-ul-Quran",
  "Aalim Course",
  "Aalimah Course",
  "Qaida & Nazra",
  "Tajweed Course",
  "Arabic Language Course",
  "Islamic Studies Diploma",
] as const;

/**
 * Authoritative registration fees (PKR), keyed by program. The client never
 * supplies the fee that gets charged — the server always looks it up here so
 * a tampered request body can't pay less than the real price.
 */
export const PROGRAM_FEES: Record<(typeof PROGRAMS)[number], number> = {
  "Hifz-ul-Quran": 5,
  "Aalim Course": 5,
  "Aalimah Course": 5,
  "Qaida & Nazra": 5,
  "Tajweed Course": 5,
  "Arabic Language Course": 5,
  "Islamic Studies Diploma": 5,
  // "Hifz-ul-Quran": 5000,
  // "Aalim Course": 8000,
  // "Aalimah Course": 8000,
  // "Qaida & Nazra": 3000,
  // "Tajweed Course": 4000,
  // "Arabic Language Course": 6000,
  // "Islamic Studies Diploma": 10000,
};

export const CAMPUSES = ["Karachi Campus", "Lahore Campus", "Islamabad Campus", "Online Campus"] as const;

export const SESSIONS = ["2026 Spring", "2026 Summer", "2026 Fall", "2027 Spring"] as const;

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
