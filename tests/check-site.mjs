// Post-build checks for the generated site. Run after `jekyll build`:
//   node tests/check-site.mjs [path/to/site]
// Fails when an <img> has no alt text, a button or link has no accessible name,
// or a page has no lang.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// optional argument: the built site to check (defaults to _site)
const SITE = process.argv[2] ? resolve(process.argv[2]) + '/' : fileURLToPath(new URL('../_site/', import.meta.url));
// untracked scratch files that live in the repo root, not part of the blog
const SKIP = [/^Affluence/, /^output\.html$/];

if (!existsSync(SITE)) {
  console.error('✖ _site/ not found, run `jekyll build` first');
  process.exit(1);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
}

// text a screen reader would announce for an element's inner HTML
function innerName(html) {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/gi, (svg) => attr(svg, 'aria-label') || '')
    .replace(/<img\b[^>]*>/gi, (img) => attr(img, 'alt') || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, 'x')
    .trim();
}

const problems = [];
let pages = 0;

for (const file of walk(SITE)) {
  if (!file.endsWith('.html')) continue;
  const rel = relative(SITE, file);
  if (SKIP.some((r) => r.test(rel))) continue;
  const html = readFileSync(file, 'utf8');
  if (html.startsWith('<meta http-equiv="refresh"')) continue;
  pages++;

  if (!/<html\b[^>]*\blang="[a-z-]+"/i.test(html)) problems.push(`${rel}: <html> has no lang`);

  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const alt = attr(tag, 'alt');
    // alt="" is allowed only when the image is explicitly marked decorative
    const decorative = alt === '' && attr(tag, 'aria-hidden') === 'true';
    if (!decorative && (!alt || !alt.trim())) problems.push(`${rel}: <img> without alt text: ${tag.slice(0, 110)}`);
  }
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    if (!attr(m[1], 'aria-label') && !attr(m[1], 'aria-labelledby') && !innerName(m[2])) {
      problems.push(`${rel}: <button> without an accessible name: ${m[0].slice(0, 110)}`);
    }
  }
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (!attr(m[1], 'href')) continue;
    if (!attr(m[1], 'aria-label') && !innerName(m[2])) {
      problems.push(`${rel}: link without an accessible name: ${m[0].slice(0, 110)}`);
    }
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s) across ${pages} pages`);
  process.exit(1);
}
console.log(`✔ ${pages} pages checked: alt text, accessible names, lang`);
