#!/usr/bin/env node
// Makes a category icon match the house style and safe to serve: one ink colour, no white background, nothing
// that can run code or load other files. See README.md.
//
//   node ops/category-art/normalize-svg.mjs input.svg output.svg
//
// No dependencies (Node 18+). It handles the SVGs Claude, Figma and vtracer write; anything stranger is refused
// rather than guessed at.
import { readFileSync, writeFileSync } from 'node:fs';

const INK = '#30404E';
const MAX_BYTES = 60_000;

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node normalize-svg.mjs <input.svg> <output.svg>');
  process.exit(2);
}

const notes = [];
function fail(message) {
  console.error('refused: ' + message);
  process.exit(1);
}

let svg = readFileSync(input, 'utf8');
if (Buffer.byteLength(svg) > MAX_BYTES) fail(`file is over ${MAX_BYTES / 1000} KB; simplify the drawing or trace with a higher speckle filter`);
if (/<!DOCTYPE|<!ENTITY/i.test(svg)) fail('DOCTYPE/ENTITY declarations are not allowed');

// Tools often wrap the file in a chat code block.
svg = svg.replace(/^[\s\S]*?(<svg\b)/i, '$1').replace(/(<\/svg>)[\s\S]*$/i, '$1');
if (!/^<svg\b[\s\S]*<\/svg>$/i.test(svg)) fail('no <svg>…</svg> found');

function drop(pattern, label) {
  const found = svg.match(pattern);
  if (found) {
    svg = svg.replace(pattern, '');
    notes.push(`removed ${found.length} ${label}`);
  }
}
drop(/<!--[\s\S]*?-->/g, 'comment(s)');
drop(/<(script|style|foreignObject|metadata|title|desc|text|image|filter|mask|clipPath|linearGradient|radialGradient|pattern|use|symbol|iframe|video|audio)\b[\s\S]*?(<\/\1>|\/>)/gi, 'unsupported element(s) (scripts, styles, text, images, gradients, filters…)');
drop(/<\/?(a|defs|switch)\b[^>]*>/gi, 'link/defs wrapper tag(s)');
drop(/\s(on[a-z]+|href|xlink:href|class|id|filter|mask|clip-path)\s*=\s*("[^"]*"|'[^']*')/gi, 'attribute(s) that can run code or reference other content');

// style="fill:…;stroke:…" → plain attributes, everything else in it dropped.
svg = svg.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (_, __, a, b) => {
  const kept = [];
  for (const rule of (a ?? b).split(';')) {
    const [prop, value] = rule.split(':').map(part => part && part.trim());
    if (/^(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|fill-rule|opacity|fill-opacity|stroke-opacity)$/i.test(prop || '') && value) {
      kept.push(` ${prop.toLowerCase()}="${value}"`);
    }
  }
  return kept.join('');
});
if (/url\(|javascript:|data:/i.test(svg)) fail('references to other content (url(), data: or javascript:) remain');

function isLight(value) {
  let r, g, b;
  const v = value.trim().toLowerCase();
  if (v === 'white') return true;
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) [r, g, b] = m[1].split('').map(c => parseInt(c + c, 16));
  m = v.match(/^#([0-9a-f]{6})$/);
  if (m) [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) [r, g, b] = m.slice(1, 4).map(Number);
  return r !== undefined && r >= 230 && g >= 230 && b >= 230;
}

let recoloured = 0;
let cleared = 0;
svg = svg.replace(/\s(fill|stroke)\s*=\s*("([^"]*)"|'([^']*)')/gi, (_, prop, __, a, b) => {
  const value = (a ?? b).trim();
  if (/^(none|transparent)$/i.test(value)) return ` ${prop}="none"`;
  if (isLight(value)) {
    cleared++;
    return ` ${prop}="none"`;
  }
  if (value.toUpperCase() !== INK) recoloured++;
  return ` ${prop}="${INK}"`;
});
if (recoloured) notes.push(`recoloured ${recoloured} line/shape colour(s) to ${INK}`);
if (cleared) notes.push(`removed ${cleared} white background/fill(s)`);
drop(/\s(opacity|fill-opacity|stroke-opacity)\s*=\s*("[^"]*"|'[^']*')/gi, 'opacity setting(s)');

// Root element: square viewBox, no fixed size, the SVG namespace.
const root = svg.match(/^<svg\b[^>]*>/i)[0];
const viewBox = root.match(/viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
let box = viewBox ? viewBox.slice(1).map(Number) : null;
if (!box) {
  const w = Number((root.match(/\swidth\s*=\s*["']([\d.]+)/i) || [])[1]);
  const h = Number((root.match(/\sheight\s*=\s*["']([\d.]+)/i) || [])[1]);
  if (w && h) box = [0, 0, w, h];
}
if (!box) fail('no viewBox (or width and height) on <svg>');
if (Math.abs(box[2] - box[3]) > box[2] * 0.01) fail(`canvas is ${box[2]} × ${box[3]}; it must be square`);
const newRoot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
svg = svg.replace(/^<svg\b[^>]*>/i, newRoot);

if (!new RegExp(INK, 'i').test(svg)) fail('nothing is drawn in ink (empty or all-white drawing)');
svg = svg.replace(/>\s+</g, '><').trim() + '\n';
writeFileSync(output, svg);
console.log(`wrote ${output} (${Buffer.byteLength(svg)} bytes, canvas ${box[2]} × ${box[3]})`);
for (const note of notes) console.log('  - ' + note);
