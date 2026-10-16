// Copy rules shared by check-legal (the built pages) and the vitest suite (the dictionaries).

// Spec 016: with v2 copy, "cheaper" and "goes first" are ffly Pro's, never the app's.
export const APP_CLAIM = /\bapp\b[^.]*\b(?:cheaper|queue|less)\b|\b(?:cheaper|queue)\b[^.]*\bapp\b/i;

// Every string in a dictionary or a widget payload, plural forms and list items included.
export const stringsOf = (value) => {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf);
  return [];
};
