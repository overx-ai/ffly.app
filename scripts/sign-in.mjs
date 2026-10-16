// Sign-in providers of the web search (specs 014, 016), shared by check-legal and its test: a provider's hosts are in the
// CSP exactly while it is ready.
export const PROVIDER_CSP = {
  apple: { 'script-src': ['appleid.cdn-apple.com'] },
  google: {
    'script-src': ['accounts.google.com'],
    'frame-src': ['accounts.google.com'],
    'connect-src': ['accounts.google.com'],
    'style-src': ['accounts.google.com'],
  },
};

// src/app.ts signInProviders, read from the text of its AUTH initialiser: check-legal cannot import TypeScript.
export function readyProviders(contract112, auth) {
  if (!contract112) return [];
  const ready = {
    apple: /appleServiceId: '[^']+'/.test(auth) && /appleRegistered: true\b/.test(auth),
    google: /googleClientId: '[^']+'/.test(auth),
  };
  return ['apple', 'google'].filter((provider) => ready[provider]);
}
