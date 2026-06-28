#!/usr/bin/env node
// Run with: node --experimental-sqlite match-schools.mjs <path-to-db.sqlite> <path-to-memberships.json>

import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';

function normalizeBasic(s) {
  return s
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/['']/g, '')   // strip apostrophes (straight + curly)
    .replace(/[.,]/g, '')
    .replace(/[-\u2010-\u2015]/g, ' ') // hyphen-minus AND unicode dashes (en dash, em dash, etc.) -- Wikipedia uses en dashes a lot, e.g. "Carson–Newman"
    .replace(/\s+/g, ' ')
    .trim();
}

// Whole-name aliases that no generic rule can derive (service academies, etc.)
// Keys/values are loose-normalized strings. Add more here as the worklist surfaces them.
const ALIASES = new Map([
  ['united states military academy', 'army'],
  ['united states air force academy', 'air force'],
  ['united states naval academy', 'navy'],
  ['catholic america', 'catholic'],                          // "Catholic University of America"
  ['north carolina charlotte', 'charlotte'],                 // "University of North Carolina at Charlotte"
  ['colorado boulder', 'colorado'],                          // "University of Colorado Boulder"
  ['california polytechnic state', 'cal poly'],              // "California Polytechnic State University"
  ['california polytechnic state pomona', 'cal poly pomona'],
]);

function normalizeLoose(s) {
  let n = normalizeBasic(s);
  n = n.replace(/\([^)]*\)/g, '');           // strip parentheticals, e.g. "(OH)"
  n = n.replace(/^the\s+/, '');
  // "California State University, Sacramento" -> "Sacramento State" (consistent CSU system convention)
  n = n.replace(/^california state university\s+(.+)$/, '$1 state');
  n = n.replace(/agricultural and mechanical/g, 'a&m');
  n = n.replace(/agricultural and technical/g, 'a&t');
  n = n.replace(/\b(university|college|of|at)\b/g, ''); // "at" handles "University at Buffalo" / "...of Alabama at Birmingham"
  n = n.replace(/\bst\b/g, 'saint');
  n = n.replace(/\s+/g, ' ').trim();
  n = ALIASES.get(n) ?? n;
  return n;
}

function addToIndex(index, key, id) {
  if (!key) return;
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(id);
}

function buildIndex(teams) {
  const basic = new Map();
  const loose = new Map();
  for (const t of teams) {
    const names = [t.school, t.alt_name1, t.alt_name2, t.alt_name3].filter(Boolean);
    for (const name of names) {
      addToIndex(basic, normalizeBasic(name), t.id);
      addToIndex(loose, normalizeLoose(name), t.id);
    }
  }
  return { basic, loose };
}

function matchSchool(wikiName, index) {
  const basicIds = index.basic.get(normalizeBasic(wikiName));
  if (basicIds?.size === 1) return { status: 'auto', candidates: [...basicIds] };
  if (basicIds?.size > 1) return { status: 'ambiguous', candidates: [...basicIds] };

  const looseIds = index.loose.get(normalizeLoose(wikiName));
  if (looseIds?.size === 1) return { status: 'suggested', candidates: [...looseIds] };
  if (looseIds?.size > 1) return { status: 'ambiguous', candidates: [...looseIds] };

  return { status: 'unmatched', candidates: [] };
}

function csvField(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export { normalizeBasic, normalizeLoose, buildIndex, matchSchool };

async function main() {
  const [, , dbPath, membershipsPath] = process.argv;
  if (!dbPath || !membershipsPath) {
    console.error('Usage: node --experimental-sqlite match-schools.mjs <db.sqlite> <memberships.json>');
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath);
  const teams = db.prepare('SELECT id, school, alt_name1, alt_name2, alt_name3 FROM teams').all();
  console.log(`Loaded ${teams.length} existing teams.`);

  const schools = JSON.parse(await readFile(membershipsPath, 'utf8'));
  console.log(`Loaded ${schools.length} schools from Wikipedia data.\n`);

  const index = buildIndex(teams);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const auto = {};
  const worklistRows = [];
  const counts = { auto: 0, suggested: 0, ambiguous: 0, unmatched: 0 };

  for (const s of schools) {
    const { status, candidates } = matchSchool(s.school, index);
    counts[status] += 1;

    if (status === 'auto') {
      auto[s.school] = candidates[0];
    } else {
      worklistRows.push({
        wikiSchool: s.school,
        status,
        candidateIds: candidates.join('; '),
        candidateNames: candidates.map((id) => teamById.get(id)?.school).join('; '),
        confirmedTeamId: '', // fill in a team_id to confirm, or write NEW to insert as a new team, or leave blank to skip
      });
    }
  }

  await writeFile('school-matches-auto.json', JSON.stringify(auto, null, 2));

  const header = 'wikiSchool,status,candidateIds,candidateNames,confirmedTeamId\n';
  const body = worklistRows
    .map((r) => [r.wikiSchool, r.status, r.candidateIds, r.candidateNames, r.confirmedTeamId].map(csvField).join(','))
    .join('\n');
  await writeFile('school-matches-worklist.csv', header + body + '\n');

  console.log('--- Match results ---');
  console.log(`Auto-matched (high confidence):    ${counts.auto}`);
  console.log(`Suggested (needs confirmation):    ${counts.suggested}`);
  console.log(`Ambiguous (multiple candidates):   ${counts.ambiguous}`);
  console.log(`Unmatched (likely a new team):     ${counts.unmatched}`);
  console.log(`\nWrote school-matches-auto.json and school-matches-worklist.csv`);

  db.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
