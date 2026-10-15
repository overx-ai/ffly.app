// @astrojs/vercel 7 knows only Node 18 and 20 and labels any newer build "nodejs18.x", which Vercel rejects.
// ponytail: pin the function to the build's own Node major; drop this script once the adapter is upgraded with Astro 5.
import { readFile, writeFile } from 'node:fs/promises';
import { VERCEL_OUTPUT } from './vercel-output.mjs';

const file = new URL('functions/_render.func/.vc-config.json', VERCEL_OUTPUT);
const config = JSON.parse(await readFile(file, 'utf8'));
config.runtime = `nodejs${process.versions.node.split('.')[0]}.x`;
await writeFile(file, JSON.stringify(config, null, '\t'));
