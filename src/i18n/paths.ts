import { TRANSLATED_LANGS } from './locales';

// getStaticPaths for src/pages/[lang]/*: English is served at the root, so only the translated languages.
export const langPaths = () => TRANSLATED_LANGS.map((l) => ({ params: { lang: l.prefix }, props: { lang: l.code } }));
