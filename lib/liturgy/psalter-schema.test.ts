/**
 * The four-week psalter, checked against the Ordo Cantus Officii.
 *
 * `IDX_ANT.csv` indexes every OCO antiphon by occasion code ("2H6" = week 2,
 * Friday), office (L/V) and place (1/2/3 for the psalmody), and its
 * `TextSource` column names the passage the antiphon is drawn from. For a
 * psalm slot that citation is, in all but a handful of cases, the psalm the
 * antiphon belongs to — which makes it a usable reference for the
 * repartition.
 *
 * It cites the **Vulgate** numbering; the schema and the rest of the app use
 * the Hebrew numbering of the Liturgy of the Hours. That difference is the
 * point of this test: fifteen slots had been written with the Vulgate number,
 * so the office paired an antiphon with the wrong psalm — Week 3 Wednesday
 * Vespers asked for Psalm 125 and 126 where the antiphons belong to 126 and
 * 127, and so on through Weeks 2 to 4.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { PSALTER_SCHEMA } from './data/psalter-schema';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Vulgate → Hebrew. The inverse of `hebrewToVulgate`, and ambiguous in the
 * same two places: Vulgate 9 and 113 each cover two Hebrew psalms, which the
 * index distinguishes with an A/B suffix ("Ps 9A,2").
 */
function vulgateToHebrew(vulgate: number, part?: string): number {
  if (vulgate === 9) return part === 'B' ? 10 : 9;
  if (vulgate <= 8) return vulgate;
  if (vulgate <= 112) return vulgate + 1;
  if (vulgate === 113) return part === 'B' ? 115 : 114;
  if (vulgate === 114 || vulgate === 115) return 116;
  if (vulgate <= 145) return vulgate + 1;
  if (vulgate === 146) return 147;
  return vulgate;
}

function citedPsalm(source: string): { vulgate: number; hebrew: number } | null {
  const m = source.match(/(?:^|\b)Ps\s+(\d+)\s*([AB])?/i);
  if (!m) return null;
  const vulgate = Number(m[1]);
  return { vulgate, hebrew: vulgateToHebrew(vulgate, m[2]) };
}

/** occasion/office/place → the sources of the antiphons OCO puts there. */
function loadOcoPsalmody(): Map<string, string[]> {
  const file = path.join(process.cwd(), 'IDX_ANT.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = Object.fromEntries(rows[0].map((h, i) => [h.trim(), i]));
  const hourOf: Record<string, string> = { L: 'lauds', V: 'vespers' };

  const index = new Map<string, string[]>();
  for (const row of rows.slice(1)) {
    const occasion = (row[col.Occasion] || '').trim().match(/^(\d)H(\d)$/);
    if (!occasion) continue;
    const hour = hourOf[(row[col.Office] || '').trim()];
    const place = (row[col.Place] || '').trim();
    if (!hour || !/^[123]$/.test(place)) continue;

    // "1H2" is week 1, day 2 counting from Sunday=1.
    const key = `${occasion[1]}|${Number(occasion[2]) - 1}|${hour}|${Number(place) - 1}`;
    const sources = index.get(key) ?? [];
    const source = (row[col.TextSource] || '').trim();
    if (source && !sources.includes(source)) sources.push(source);
    index.set(key, sources);
  }
  return index;
}

/**
 * Slots where the antiphon is genuinely not taken from its own psalm. Each is
 * a real pairing in the books, so they are listed rather than papered over.
 */
const ANTIPHON_FROM_ELSEWHERE = new Set([
  '2|1|vespers|1', // Ps 45, the wedding psalm, with "Ecce sponsus venit" (Mt 25:6)
  '2|2|vespers|1', // Ps 49 (II) with Is 38:17
  '3|5|vespers|1', // Ps 135 (II) with Deut 32:36
]);

test('no psalter slot carries a Vulgate number where the office wants a Hebrew one', () => {
  const oco = loadOcoPsalmody();
  assert.ok(oco.size > 100, 'the OCO antiphon index did not load');

  const wrong: string[] = [];
  for (let week = 1; week <= 4; week++) {
    for (let day = 0; day < 7; day++) {
      for (const hour of ['lauds', 'vespers'] as const) {
        const units = PSALTER_SCHEMA[week]?.[day]?.[hour]?.units ?? [];
        for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          if (unit.type !== 'psalm') continue;

          const key = `${week}|${day}|${hour}|${i}`;
          if (ANTIPHON_FROM_ELSEWHERE.has(key)) continue;
          const cited = (oco.get(key) ?? []).map(citedPsalm).filter(Boolean);
          if (!cited.length) continue; // Sundays: OCO indexes those elsewhere

          const id = parseInt(String(unit.id), 10);
          if (cited.some((c) => c!.hebrew === id)) continue;

          // The tell for the bug: the schema's number is the Vulgate one.
          const asVulgate = cited.find((c) => c!.vulgate === id);
          wrong.push(
            `Week ${week} ${DAYS[day]} ${hour} psalm ${i + 1}: schema says ${id}` +
            (asVulgate
              ? ` — that is the Vulgate number; OCO's antiphon belongs to Psalm ${asVulgate.hebrew}`
              : `; OCO's antiphon is from Psalm ${cited.map((c) => c!.hebrew).join(' or ')}`),
          );
        }
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test('every prescribed verse range exists in the psalm it names', () => {
  // "1-13" against a psalm that ends at verse 11 silently yields a short
  // psalm, which is how the old Psalm 71 entries hid: they carried Psalm 48's
  // and Psalm 71's Vulgate verse divisions.
  const novaVulgata = fs.readFileSync(
    path.join(process.cwd(), 'jgabc-psalms', 'NovaVulgata.txt'), 'utf8',
  ).replace(/^﻿/, '');

  const lastVerse = new Map<number, number>();
  let current: number | null = null;
  for (const raw of novaVulgata.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^PSALMUS\s+(\d+)\b/);
    if (heading) { current = Number(heading[1]); continue; }
    const verse = line.match(/^(\d+)\s/);
    if (current && verse) lastVerse.set(current, Number(verse[1]));
  }
  assert.equal(lastVerse.size, 150, 'the Nova Vulgata psalter did not parse');

  const bad: string[] = [];
  for (let week = 1; week <= 4; week++) {
    for (let day = 0; day < 7; day++) {
      for (const hour of ['lauds', 'vespers'] as const) {
        for (const unit of PSALTER_SCHEMA[week]?.[day]?.[hour]?.units ?? []) {
          if (unit.type !== 'psalm' || !unit.verses) continue;
          const id = parseInt(String(unit.id), 10);
          const end = Number(unit.verses.split(/[-–]/)[1] ?? unit.verses);
          const last = lastVerse.get(id);
          if (last !== undefined && end > last) {
            bad.push(
              `Week ${week} ${DAYS[day]} ${hour}: Psalm ${id} verses "${unit.verses}" ` +
              `but the psalm ends at verse ${last}`,
            );
          }
        }
      }
    }
  }
  assert.deepEqual(bad, []);
});
