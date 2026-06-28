#!/usr/bin/env node
/**
 * Fetches en.wikipedia.org's Module:College football conference/data
 * and parses it into { school, memberships: [{ start, end, conferenceTarget, conferenceDisplay }] } rows.
 *
 * This module is the backing data for every conference-membership infobox/timeline
 * across Wikipedia's college football pages — it spans FBS, FCS, D2, D3, and NAIA.
 *
 * Run with: node fetch-cfb-conference-data.mjs
 * Requires Node 18+ (native fetch).
 */

import { writeFile } from 'node:fs/promises';

const MODULE_URL =
  'https://en.wikipedia.org/w/index.php?title=Module:College_football_conference/data&action=raw';

// Wikipedia asks bots/scripts to identify themselves. Put a real contact in here.
const USER_AGENT = 'cfb-conference-history-personal-project/0.1 (contact: you@example.com)';

async function fetchModuleText() {
  const res = await fetch(MODULE_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

function unescapeLua(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function parseYearRange(s) {
  // forms seen: "1992-1999", "2000-" (open-ended/current), "1986" (single season),
  // "-1918" (open start - earliest recorded history through 1918)
  let m = s.match(/^(\d{4})-(\d{4})?$/);
  if (m) return { start: Number(m[1]), end: m[2] ? Number(m[2]) : null, openStart: false };
  m = s.match(/^(\d{4})$/);
  if (m) return { start: Number(m[1]), end: Number(m[1]), openStart: false };
  m = s.match(/^-(\d{4})$/);
  if (m) return { start: null, end: Number(m[1]), openStart: true };
  return { start: null, end: null, openStart: false, unparsed: true }; // flag for manual review
}

function parseWikilink(s) {
  const trimmed = s.trim();
  // forms: "[[Target|Display]]" or "[[Target]]"
  const m = trimmed.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (m) return { target: m[1].trim(), display: (m[2] || m[1]).trim(), multiLink: false };
  // Compound/dual entries, e.g. "[[NCAC|NCAC]]/[[UAA|UAA]]" -- a school listed under
  // two conferences at once (often a transition year). Flag for manual review rather
  // than silently using the raw wikitext as the target.
  if ((trimmed.match(/\[\[/g) || []).length > 1) {
    return { target: trimmed, display: trimmed, multiLink: true };
  }
  return { target: trimmed, display: trimmed, multiLink: false }; // occasionally a bare string, not a link
}

function parseMembershipRows(blockBody) {
  const rows = [];
  // Stops at the closing quote of the value — anything after on the line
  // (a trailing comment) is ignored by construction, so we don't need to
  // strip Lua "--" comments separately.
  const rowRe = /\["([^"]+)"\]\s*=\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = rowRe.exec(blockBody)) !== null) {
    const { start, end, openStart, unparsed } = parseYearRange(m[1]);
    const { target, display, multiLink } = parseWikilink(unescapeLua(m[2]));
    rows.push({ yearRange: m[1], start, end, openStart, unparsed, conferenceTarget: target, conferenceDisplay: display, multiLink });
  }
  return rows;
}

function parseModule(luaText) {
  const startIdx = luaText.indexOf('return {');
  const body = startIdx >= 0 ? luaText.slice(startIdx) : luaText;

  const schools = [];
  // Matches each top-level ["School Name"] = { ... }, block.
  // Lazy match up to a closing "},": holds as long as comment lines inside
  // a school's block don't themselves contain that exact newline+brace pattern.
  const schoolBlockRe = /\["((?:[^"\\]|\\.)*)"\]\s*=\s*\{([\s\S]*?)\n\s*\},/g;
  let match;
  while ((match = schoolBlockRe.exec(body)) !== null) {
    const schoolName = unescapeLua(match[1]);
    const memberships = parseMembershipRows(match[2]);
    if (memberships.length > 0) {
      schools.push({ school: schoolName, memberships });
    }
  }
  return schools;
}

export { parseModule, parseMembershipRows, parseYearRange, parseWikilink, unescapeLua };

async function main() {
  console.log('Fetching module...');
  const luaText = await fetchModuleText();
  console.log(`Fetched ${luaText.length.toLocaleString()} characters.`);

  console.log('Parsing...');
  const schools = parseModule(luaText);
  console.log(`Parsed ${schools.length} schools.`);

  const totalRows = schools.reduce((sum, s) => sum + s.memberships.length, 0);
  console.log(`Total membership rows: ${totalRows}`);

  const flagged = schools.flatMap((s) =>
    s.memberships
      .filter((m) => m.unparsed || m.multiLink)
      .map((m) => ({ school: s.school, yearRange: m.yearRange, reason: m.unparsed ? 'unparsed year range' : 'compound/dual conference link' }))
  );
  if (flagged.length) {
    console.log(`\nFlagged for manual review (unparsed year range): ${flagged.length}`);
    console.log(flagged.slice(0, 20));
  }

  await writeFile('cfb-conference-memberships.json', JSON.stringify(schools, null, 2));
  console.log('\nWrote cfb-conference-memberships.json');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
