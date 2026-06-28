#!/usr/bin/env node
/**
 * Reads cfb-conference-memberships.json (output of fetch-cfb-conference-data.mjs)
 * and builds:
 *   - conference-levels-auto.json: conferences whose level is unambiguous from the
 *     name itself (the "independent schools" placeholder entries)
 *   - conference-level-worklist.csv: every other distinct conference, sorted by how
 *     many membership rows reference it, with an empty `level` column for you to fill in.
 *
 * Usage: node build-conference-level-worklist.mjs [path-to-memberships.json]
 */

import { readFile, writeFile } from 'node:fs/promises';

const INPUT = process.argv[2] || 'cfb-conference-memberships.json';
const AUTO_OUT = 'conference-levels-auto.json';
const WORKLIST_OUT = 'conference-level-worklist.csv';

// These placeholder targets already encode their level in the name -- no
// curation needed. "NCAA Division I independent schools" (no FBS/FCS
// qualifier) is the pre-1978 form, before the subdivision split existed.
const AUTO_LEVEL_PATTERNS = [
  [/^NCAA Division I FBS independent schools$/, 'FBS'],
  [/^NCAA Division I FCS independent schools$/, 'FCS'],
  [/^NCAA Division I independent schools$/, 'D1'],
  [/^NCAA Division II independent schools$/, 'D2'],
  [/^NCAA Division III independent schools$/, 'D3'],
  [/^NAIA independent football schools$/, 'NAIA'],
];

// Wikipedia uses a bare dash to mean "school existed but fielded no football team
// this period" -- not a conference, and not eligible for a level assignment.
const NO_FOOTBALL_PLACEHOLDER = /^[-\u2010-\u2015]+$/;

function classify(target) {
  if (NO_FOOTBALL_PLACEHOLDER.test(target.trim())) return 'NO_FOOTBALL';
  for (const [re, level] of AUTO_LEVEL_PATTERNS) {
    if (re.test(target)) return level;
  }
  return null;
}

function csvField(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const schools = JSON.parse(await readFile(INPUT, 'utf8'));

  const stats = new Map(); // conferenceTarget -> { count, minYear, maxYear, displays }

  for (const school of schools) {
    for (const m of school.memberships) {
      const key = m.conferenceTarget;
      if (!stats.has(key)) {
        stats.set(key, { count: 0, minYear: Infinity, maxYear: -Infinity, displays: new Set() });
      }
      const s = stats.get(key);
      s.count += 1;
      const yStart = m.start ?? m.end;
      const yEnd = m.end ?? m.start;
      if (yStart !== null && yStart < s.minYear) s.minYear = yStart;
      if (yEnd !== null && yEnd > s.maxYear) s.maxYear = yEnd;
      s.displays.add(m.conferenceDisplay);
    }
  }

  const auto = {};
  const worklistRows = [];
  let noFootballRowCount = 0;

  for (const [target, s] of stats) {
    const autoLevel = classify(target);
    if (autoLevel === 'NO_FOOTBALL') {
      noFootballRowCount += s.count;
      continue; // not a conference -- exclude entirely, don't classify or add to worklist
    }
    if (autoLevel) {
      auto[target] = autoLevel;
    } else {
      worklistRows.push({
        conferenceTarget: target,
        rowCount: s.count,
        minYear: s.minYear,
        maxYear: s.maxYear,
        displays: [...s.displays].join('; '),
        level: '', // fill in: FBS / FCS / D2 / D3 / NAIA -- note era overrides separately if it changed level
      });
    }
  }

  worklistRows.sort((a, b) => b.rowCount - a.rowCount);

  await writeFile(AUTO_OUT, JSON.stringify(auto, null, 2));

  const header = 'conferenceTarget,rowCount,minYear,maxYear,displays,level\n';
  const body = worklistRows
    .map((r) =>
      [r.conferenceTarget, r.rowCount, r.minYear, r.maxYear, r.displays, r.level].map(csvField).join(',')
    )
    .join('\n');
  await writeFile(WORKLIST_OUT, header + body + '\n');

  console.log(`Auto-classified (independent-status placeholders): ${Object.keys(auto).length}`);
  console.log(auto);
  console.log(`Excluded as "no football played" placeholder rows: ${noFootballRowCount} (these are not conferences -- represent program-inactive periods)`);
  console.log(`\nNeeds manual level assignment: ${worklistRows.length} distinct conferences`);
  console.log(`Wrote ${AUTO_OUT} and ${WORKLIST_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
