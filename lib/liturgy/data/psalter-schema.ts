/**
 * 4-Week Psalter Schema (GILH)
 *
 * Psalm and Canticle assignments for Weeks 1–4 across all days of the week.
 * Sources: Ordo Cantus Officii (OCO) feria file, cross-referenced with GILH.
 *
 * Antiphon codes: nHd = Week n, day d (1=Sunday, 2=Mon, ..., 7=Sat)
 * OCO office codes: L=Laudes, V=Vesperae, Ol=Off. Lect., Hm=Horae Mediae
 *
 * For Lauds, the three psalmodia units are:
 *   1. A morning psalm
 *   2. An OT canticle
 *   3. A praise psalm (typically from Pss 148-150 range)
 *
 * For Vespers, the three psalmodia units are:
 *   1. Psalm 1
 *   2. Psalm 2
 *   3. NT Canticle
 */

export interface PsalmodiaUnit {
  type: 'psalm' | 'ot-canticle' | 'nt-canticle';
  id: string;       // psalm number or canticle ID (e.g. "63", "ot-1", "nt-2")
  title: string;    // human-readable short title (used in antiphon label)
  subtitle?: string; // descriptive psalm heading shown as rubric (e.g. "God is the unfailing support of the just")
  defaultTone?: string;  // e.g. "8.G"
  verses?: string;
}

export interface HourPsalterAssignment {
  units: [PsalmodiaUnit, PsalmodiaUnit, PsalmodiaUnit];
}

export interface DayPsalterAssignment {
  lauds: HourPsalterAssignment;
  vespers: HourPsalterAssignment;
}

// ── Compline Fixed Night Psalms (same across all 4 weeks) ──────────────────
export const COMPLINE_PSALMS: Record<string, PsalmodiaUnit[]> = {
  // Sunday uses Pss 4 + 134 (or 91 on some traditions)
  sunday: [
    { type: 'psalm', id: '4',   title: 'Psalm 4',   defaultTone: '8.G' },
    { type: 'psalm', id: '134', title: 'Psalm 134', defaultTone: '8.G' },
  ],
  // Monday: Ps 86
  monday: [
    { type: 'psalm', id: '86', title: 'Psalm 86', defaultTone: '8.G' },
  ],
  // Tuesday: Ps 143
  tuesday: [
    { type: 'psalm', id: '143', title: 'Psalm 143', defaultTone: '8.G' },
  ],
  // Wednesday: Pss 31 + 130
  wednesday: [
    { type: 'psalm', id: '31',  title: 'Psalm 31',  defaultTone: '8.G' },
    { type: 'psalm', id: '130', title: 'Psalm 130', defaultTone: '8.G' },
  ],
  // Thursday: Ps 16
  thursday: [
    { type: 'psalm', id: '16', title: 'Psalm 16', defaultTone: '8.G' },
  ],
  // Friday: Ps 88
  friday: [
    { type: 'psalm', id: '88', title: 'Psalm 88', defaultTone: '8.G' },
  ],
  // Saturday: Pss 4 + 134 (same as Sunday)
  saturday: [
    { type: 'psalm', id: '4',   title: 'Psalm 4',   defaultTone: '8.G' },
    { type: 'psalm', id: '134', title: 'Psalm 134', defaultTone: '8.G' },
  ],
};

// ── Minor Hours (Terce/Sext/None) fixed psalms ─────────────────────────────
// From GILH §§76–83: Psalm 119 strophes cycle through Terce-Sext-None each day.
// The pattern cycles across days: Terce = strophes i, Sext = strophes ii, None = strophes iii
// On Sunday the "hour psalms" (Pss 117-118) are used instead.
export const MINOR_HOUR_PSALMS: Record<string, Record<string, PsalmodiaUnit[]>> = {
  // Each day: { terce, sext, none } arrays
  sunday: {
    terce: [{ type: 'psalm', id: '118', title: 'Psalm 118', defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '118', title: 'Psalm 118', defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '118', title: 'Psalm 118', defaultTone: '8.G' }],
  },
  // Monday–Saturday: Ps 119 strophes cycle
  monday: {
    terce: [{ type: 'psalm', id: '119.1-8',   title: 'Ps 119 I (1–8)',   defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '119.17-24',  title: 'Ps 119 III (17–24)', defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '119.33-40',  title: 'Ps 119 V (33–40)',  defaultTone: '8.G' }],
  },
  tuesday: {
    terce: [{ type: 'psalm', id: '119.49-56',  title: 'Ps 119 VII (49–56)',  defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '119.57-64',  title: 'Ps 119 VIII (57–64)', defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '119.65-72',  title: 'Ps 119 IX (65–72)',  defaultTone: '8.G' }],
  },
  wednesday: {
    terce: [{ type: 'psalm', id: '119.73-80',  title: 'Ps 119 X (73–80)',  defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '119.81-88',  title: 'Ps 119 XI (81–88)', defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '119.89-96',  title: 'Ps 119 XII (89–96)', defaultTone: '8.G' }],
  },
  thursday: {
    terce: [{ type: 'psalm', id: '119.97-104',   title: 'Ps 119 XIII (97–104)',   defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '119.105-112',  title: 'Ps 119 XIV (105–112)',  defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '119.113-120',  title: 'Ps 119 XV (113–120)',  defaultTone: '8.G' }],
  },
  friday: {
    terce: [{ type: 'psalm', id: '119.121-128',  title: 'Ps 119 XVI (121–128)', defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '119.129-136',  title: 'Ps 119 XVII (129–136)', defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '119.136-144',  title: 'Ps 119 XVIII (136–144)', defaultTone: '8.G' }],
  },
  saturday: {
    terce: [{ type: 'psalm', id: '119.145-152',  title: 'Ps 119 XIX (145–152)', defaultTone: '8.G' }],
    sext:  [{ type: 'psalm', id: '119.153-160',  title: 'Ps 119 XX (153–160)', defaultTone: '8.G' }],
    none:  [{ type: 'psalm', id: '119.161-168',  title: 'Ps 119 XXI (161–168)', defaultTone: '8.G' }],
  },
};

// ── OT Canticle mapping: OCO canticle refs -> canticle index ────────────────
// The Abbey Psalter canticles are numbered OT 1–58, NT 1–12
// These are referenced in the psalter schema as 'ot-N' and 'nt-N'
// OCO psalm references map to these as follows:
//   Dan 3,57-88 -> ot-1    1 Chr 29,10-13 -> ot-2    Tob 13,2-8 -> ot-3
//   Is 2:2-5 -> ot-4       Is 12 -> ot-5              Hab 3:2-19 -> ot-6
//   Deut 32 -> ot-7        Dan 3:26-41 -> ot-8 (Wk2 Sun)  Is 38:10-20 -> ot-9
//   Is 1:10-18 -> ot-10    1 Sam 2 -> ot-11 (Wk2)    Hab 3 -> ot-12 (Wk2 Fri)
//   Is 40:10-17 -> ot-13   Wis 9:10 -> ot-14          Is 42:10-16 -> ot-15
//   Jer 31 -> ot-16        Is 45:15-25 -> ot-17        Is 61 -> ot-18
//   Is 66:10-14 -> ot-19   Ez 36:24-28 -> ot-20        Is 2:3 -> ot-21
//   Is 26:9 -> ot-22       1 Sam 2 -> ot-23             Is 40 -> ot-24
//   Is 66:12 -> ot-25      Sap 9:10 -> ot-26            Ez 36:26 -> ot-27
//   Ps 118 -> used as psalm   Ps 146-147 -> psalms

// ── NT Canticle mapping ────────────────────────────────────────────────────
//   Rev 19:1-7 -> nt-1     Eph 1:3-10 -> nt-2         Rev 4:11;5:9-12 -> nt-3
//   Col 1:12-20 -> nt-4    Rev 11:17-18;12:10-12 -> nt-5  Rev 15:3-4 -> nt-6
//   Ap 4:11 -> nt-3 (alt)  Eph 1:4 -> nt-2 (alt)     Sap 10:17 -> (ot canticle)
//   Ap 5:12 -> nt-3 (alt)  Col 1:12 -> nt-4 (alt)     Ap 12:10 -> nt-5
//   Ap 15:3 -> nt-6        Rev 19 -> nt-1              Rev 21:2 -> nt-7

// ── 4-Week Psalter Schema for Lauds and Vespers ────────────────────────────
// Key: week (1-4) -> day (0=Sun, 1=Mon, ..., 6=Sat) -> { lauds, vespers }
// Psalm IDs reference the Abbey Psalms collection for canticles,
// and the Grail Psalter for psalms.
// OCO source: oco_fer.tex (PSALTERIUM sections)
export const PSALTER_SCHEMA: Record<number, Record<number, DayPsalterAssignment>> = {

  // ═══════════════════════════════════════════════════════
  // WEEK 1
  // ═══════════════════════════════════════════════════════
  1: {
    // Sunday — 1H1
    0: {
      lauds: { units: [
        { type: 'psalm',       id: '63',  title: 'Psalm 63',             defaultTone: '7.a' },
        { type: 'ot-canticle', id: '1',   title: 'OT Canticle (Dan 3)',  defaultTone: '8.G' },
        { type: 'psalm',       id: '149', title: 'Psalm 149',            defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',            defaultTone: '1.D' },
        { type: 'psalm',       id: '114', title: 'Psalm 114',            defaultTone: '1.D' },
        { type: 'nt-canticle', id: '12',   title: 'NT Canticle (Rev 19)', defaultTone: '8.G' },
      ]},
    },
    // Monday — 1H2 (OCO: Ps 5 | OT 1Chr 29 | Ps 29 / Vespers: Ps 11, Ps 15, Eph 1)
    1: {
      lauds: { units: [
        { type: 'psalm',       id: '5',  title: 'Psalm 5',                    defaultTone: '1.D' },
        { type: 'ot-canticle', id: '2',  title: 'OT Canticle (1 Chr 29)',     defaultTone: '1.D' },
        { type: 'psalm',       id: '29', title: 'Psalm 29',                   defaultTone: '1.D' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '11', title: 'Psalm 11',                   defaultTone: '8.G' },
        { type: 'psalm',       id: '15', title: 'Psalm 15',                   defaultTone: '8.G' },
        { type: 'nt-canticle', id: '4',  title: 'NT Canticle (Eph 1:3-10)',   defaultTone: '8.G' },
      ]},
    },
    // Tuesday — 1H3 (OCO: Ps 24 | Tob 13 | Ps 33 / Vespers: Ps 20, Ps 21, Rev 4-5)
    2: {
      lauds: { units: [
        { type: 'psalm',       id: '24', title: 'Psalm 24',                       defaultTone: '4.E' },
        { type: 'ot-canticle', id: '3',  title: 'OT Canticle (Tob 13)',           defaultTone: '4.E' },
        { type: 'psalm',       id: '33', title: 'Psalm 33',                       defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '20', title: 'Psalm 20',                       defaultTone: '2.D' },
        { type: 'psalm',       id: '21', title: 'Psalm 21',                       defaultTone: '2.D' },
        { type: 'nt-canticle', id: '9',  title: 'NT Canticle (Rev 4:11; 5:9-12)', defaultTone: '2.D' },
      ]},
    },
    // Wednesday — 1H4 (OCO: Ps 36 | Jdt 16 | Ps 47 / Vespers: Ps 27, Ps 27b, Col 1)
    3: {
      lauds: { units: [
        { type: 'psalm',       id: '36', title: 'Psalm 36',                     defaultTone: '7.c' },
        { type: 'ot-canticle', id: '4',  title: 'OT Canticle (Jdt 16)',         defaultTone: '7.c' },
        { type: 'psalm',       id: '47', title: 'Psalm 47',                     defaultTone: '7.c' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '27',   title: 'Psalm 27 (1–6)',             defaultTone: '8.G', verses: '1-6' },
        { type: 'psalm',       id: '27',   title: 'Psalm 27 (7–14)',            defaultTone: '8.G', verses: '7-14' },
        { type: 'nt-canticle', id: '6',    title: 'NT Canticle (Col 1:12-20)', defaultTone: '8.G' },
      ]},
    },
    // Thursday — 1H5 (OCO: Ps 57|Is 31 | Ps 48 / Vespers: Ps 30, Ps 32, Rev 11-12)
    4: {
      lauds: { units: [
        { type: 'psalm',       id: '57', title: 'Psalm 57',                         defaultTone: '2.D' },
        { type: 'ot-canticle', id: '5',  title: 'OT Canticle (Is 12:1-6)',          defaultTone: '2.D' },
        { type: 'psalm',       id: '48', title: 'Psalm 48',                         defaultTone: '2.D' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '30', title: 'Psalm 30',                          defaultTone: '8.G' },
        { type: 'psalm',       id: '32', title: 'Psalm 32',                          defaultTone: '8.G' },
        { type: 'nt-canticle', id: '10',  title: 'NT Canticle (Rev 11:17-18; 12:10-12)', defaultTone: '8.G' },
      ]},
    },
    // Friday — 1H6 (OCO: Ps 51 | Is 45 | Ps 100 / Vespers: Ps 41, Ps 46, Rev 15)
    5: {
      lauds: { units: [
        { type: 'psalm',       id: '51',  title: 'Psalm 51',                 defaultTone: '4.E' },
        { type: 'ot-canticle', id: '6',   title: 'OT Canticle (Hab 3:2-19)', defaultTone: '4.E' },
        { type: 'psalm',       id: '100', title: 'Psalm 100',                defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '41', title: 'Psalm 41',                  defaultTone: '1.D' },
        { type: 'psalm',       id: '46', title: 'Psalm 46',                  defaultTone: '1.D' },
        { type: 'nt-canticle', id: '11',  title: 'NT Canticle (Rev 15:3-4)',  defaultTone: '1.D' },
      ]},
    },
    // Saturday — 1H7 (OCO: Ps 63 | Ex 15 | Ps 117 / Vespers: Ps 110, Ps 114, Rev 19)
    6: {
      lauds: { units: [
        { type: 'psalm',       id: '63',  title: 'Psalm 63',                     defaultTone: '8.G' },
        { type: 'ot-canticle', id: '7',   title: 'OT Canticle (Deut 32:1-12)',   defaultTone: '8.G' },
        { type: 'psalm',       id: '117', title: 'Psalm 117',                    defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',             defaultTone: '1.D' },
        { type: 'psalm',       id: '114', title: 'Psalm 114',             defaultTone: '1.D' },
        { type: 'nt-canticle', id: '5',   title: 'NT Canticle (Phil 2:6-11)', defaultTone: '8.G' },
      ]},
    },
  },

  // ═══════════════════════════════════════════════════════
  // WEEK 2
  // ═══════════════════════════════════════════════════════
  2: {
    // Sunday — 2H1 (OCO: Ps 118 | Dan 3:51 | Ps 150 / Vespers: Ps 110, Ps 111, Nt)
    0: {
      lauds: { units: [
        { type: 'psalm',       id: '118', title: 'Psalm 118',             defaultTone: '8.G' },
        { type: 'ot-canticle', id: '8',   title: 'OT Canticle (Dan 3)',   defaultTone: '8.G' },
        { type: 'psalm',       id: '150', title: 'Psalm 150',             defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',            defaultTone: '1.D' },
        { type: 'psalm',       id: '111', title: 'Psalm 111',            defaultTone: '1.D' },
        { type: 'nt-canticle', id: '12',   title: 'NT Canticle (Rev 19)', defaultTone: '8.G' },
      ]},
    },
    // Monday — 2H2 (OCO: Ps 63 | Sir 36 | Ps 18 / Vespers: Ps 45, [Mt], Eph 1)
    1: {
      lauds: { units: [
        { type: 'psalm',       id: '63', title: 'Psalm 63',               defaultTone: '8.G' },
        { type: 'ot-canticle', id: '9',  title: 'OT Canticle (Is 38)',    defaultTone: '8.G' },
        { type: 'psalm',       id: '18', title: 'Psalm 18',               defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '45', title: 'Psalm 45',               defaultTone: '1.D', verses: '2-10' },
        { type: 'psalm',       id: '45', title: 'Psalm 45 (cont.)',       defaultTone: '1.D', verses: '11-18' },
        { type: 'nt-canticle', id: '4',  title: 'NT Canticle (Eph 1:3-10)', defaultTone: '8.G' },
      ]},
    },
    // Tuesday — 2H3 (OCO: Ps 43 | Is 38 | Ps 65 / Vespers: Ps 49, Is 38, Rev 5)
    2: {
      lauds: { units: [
        { type: 'psalm',       id: '43', title: 'Psalm 43',                defaultTone: '4.E' },
        { type: 'ot-canticle', id: '10', title: 'OT Canticle (Is 1)',      defaultTone: '4.E' },
        { type: 'psalm',       id: '65', title: 'Psalm 65',                defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '48', title: 'Psalm 48',                defaultTone: '2.D', verses: '2-9' },
        { type: 'psalm',       id: '48', title: 'Psalm 48 (cont.)',        defaultTone: '2.D', verses: '10-15' },
        { type: 'nt-canticle', id: '9',  title: 'NT Canticle (Rev 4:11; 5:9-12)', defaultTone: '2.D' },
      ]},
    },
    // Wednesday — 2H4 (OCO: Ps 77 | 1 Sam 2 | Ps 97 / Vespers: Ps 62, Ps 67, Wis 7)
    3: {
      lauds: { units: [
        { type: 'psalm',       id: '77', title: 'Psalm 77',                  defaultTone: '7.c' },
        { type: 'ot-canticle', id: '11', title: 'OT Canticle (1 Sam 2)',     defaultTone: '7.c' },
        { type: 'psalm',       id: '97', title: 'Psalm 97',                  defaultTone: '7.c' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '62', title: 'Psalm 62',                  defaultTone: '8.G' },
        { type: 'psalm',       id: '67', title: 'Psalm 67',                  defaultTone: '8.G' },
        { type: 'nt-canticle', id: '6',  title: 'NT Canticle (Col 1:12-20)',       defaultTone: '8.G' },
      ]},
    },
    // Thursday — 2H5 (OCO: Ps 80 | Is 12 | Ps 81 / Vespers: Ps 72, Ps 72b, Rev 12)
    4: {
      lauds: { units: [
        { type: 'psalm',       id: '80', title: 'Psalm 80',                  defaultTone: '2.D' },
        { type: 'ot-canticle', id: '5',  title: 'OT Canticle (Is 12)',       defaultTone: '2.D' },
        { type: 'psalm',       id: '81', title: 'Psalm 81',                  defaultTone: '2.D' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '71', title: 'Psalm 71',                  defaultTone: '8.G', verses: '1-13' },
        { type: 'psalm',       id: '71', title: 'Psalm 71 (cont.)',          defaultTone: '8.G', verses: '14-24' },
        { type: 'nt-canticle', id: '10',  title: 'NT Canticle (Rev 11:17-18; 12:10-12)',   defaultTone: '8.G' },
      ]},
    },
    // Friday — 2H6 (OCO: Ps 51 | Hab 3 | Ps 147A / Vespers: Ps 115, Ps 121, Ps 111)
    5: {
      lauds: { units: [
        { type: 'psalm',       id: '51',   title: 'Psalm 51',                defaultTone: '4.E' },
        { type: 'ot-canticle', id: '12',   title: 'OT Canticle (Hab 3)',     defaultTone: '4.E' },
        { type: 'psalm',       id: '147A', title: 'Psalm 147A',              defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '114', title: 'Psalm 114',                defaultTone: '1.D' },
        { type: 'psalm',       id: '120', title: 'Psalm 120',                defaultTone: '1.D' },
        { type: 'nt-canticle', id: '11',   title: 'NT Canticle (Rev 15:3-4)',   defaultTone: '1.D' },
      ]},
    },
    // Saturday — 2H7 (OCO: Ps 104 | Deut 32 | Ps 8 / Vespers: Ps 110, Ps 114, Rev 19)
    6: {
      lauds: { units: [
        { type: 'psalm',       id: '103', title: 'Psalm 103',                defaultTone: '8.G' },
        { type: 'ot-canticle', id: '7',   title: 'OT Canticle (Deut 32)',    defaultTone: '8.G' },
        { type: 'psalm',       id: '8',   title: 'Psalm 8',                  defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',                defaultTone: '1.D' },
        { type: 'psalm',       id: '114', title: 'Psalm 114',                defaultTone: '1.D' },
        { type: 'nt-canticle', id: '6',   title: 'NT Canticle (Col 1:12-20)',     defaultTone: '8.G' },
      ]},
    },
  },

  // ═══════════════════════════════════════════════════════
  // WEEK 3
  // ═══════════════════════════════════════════════════════
  3: {
    // Sunday — 3H1 (OCO: Ps 93 | Dan 3:57 | Ps 148 / Vespers: Ps 110, Ps 111, Nt)
    0: {
      lauds: { units: [
        { type: 'psalm',       id: '93',  title: 'Psalm 93',                defaultTone: '8.G' },
        { type: 'ot-canticle', id: '1',   title: 'OT Canticle (Dan 3)',     defaultTone: '8.G' },
        { type: 'psalm',       id: '148', title: 'Psalm 148',               defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',               defaultTone: '1.D' },
        { type: 'psalm',       id: '111', title: 'Psalm 111',               defaultTone: '1.D' },
        { type: 'nt-canticle', id: '12',   title: 'NT Canticle (Rev 19)',    defaultTone: '8.G' },
      ]},
    },
    // Monday — 3H2 (OCO: Ps 84 | Is 2 | Ps 96 / Vespers: Ps 123, Ps 124)
    1: {
      lauds: { units: [
        { type: 'psalm',       id: '84', title: 'Psalm 84',                  defaultTone: '8.G' },
        { type: 'ot-canticle', id: '13', title: 'OT Canticle (Is 2:2-5)',   defaultTone: '8.G' },
        { type: 'psalm',       id: '96', title: 'Psalm 96',                  defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '122', title: 'Psalm 122',                defaultTone: '8.G' },
        { type: 'psalm',       id: '123', title: 'Psalm 123',                defaultTone: '8.G' },
        { type: 'nt-canticle', id: '4',   title: 'NT Canticle (Eph 1:3-10)',             defaultTone: '8.G' },
      ]},
    },
    // Tuesday — 3H3 (OCO: Ps 85 | Is 26 | Ps 67 / Vespers: Ps 125, Ps 131)
    2: {
      lauds: { units: [
        { type: 'psalm',       id: '85', title: 'Psalm 85',                  defaultTone: '4.E' },
        { type: 'ot-canticle', id: '14', title: 'OT Canticle (Is 26:9)',    defaultTone: '4.E' },
        { type: 'psalm',       id: '67', title: 'Psalm 67',                  defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '124', title: 'Psalm 124',                defaultTone: '2.D' },
        { type: 'psalm',       id: '130', title: 'Psalm 130',                defaultTone: '2.D' },
        { type: 'nt-canticle', id: '9',   title: 'NT Canticle (Rev 4:11; 5:9-12)',             defaultTone: '2.D' },
      ]},
    },
    // Wednesday — 3H4 (OCO: Ps 86 | Ps 119 | Ps 98 / Vespers: Ps 126, Ps 127)
    3: {
      lauds: { units: [
        { type: 'psalm',       id: '86', title: 'Psalm 86',                  defaultTone: '7.c' },
        { type: 'ot-canticle', id: '15', title: 'OT Canticle (Is 40:10-17)',defaultTone: '7.c' },
        { type: 'psalm',       id: '98', title: 'Psalm 98',                  defaultTone: '7.c' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '125', title: 'Psalm 125',                defaultTone: '8.G' },
        { type: 'psalm',       id: '126', title: 'Psalm 126',                defaultTone: '8.G' },
        { type: 'nt-canticle', id: '6',   title: 'NT Canticle (Col 1:12-20)',             defaultTone: '8.G' },
      ]},
    },
    // Thursday — 3H5 (OCO: Ps 87 | Is 40 | Ps 145 / Vespers: Ps 132, Ps 132b)
    4: {
      lauds: { units: [
        { type: 'psalm',       id: '87',  title: 'Psalm 87',                defaultTone: '2.D' },
        { type: 'ot-canticle', id: '16',  title: 'OT Canticle (Is 40)',     defaultTone: '2.D' },
        { type: 'psalm',       id: '145', title: 'Psalm 145',               defaultTone: '2.D' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '132', title: 'Psalm 132',                defaultTone: '8.G', verses: '1-10' },
        { type: 'psalm',       id: '132', title: 'Psalm 132 (cont.)',        defaultTone: '8.G', verses: '11-18' },
        { type: 'nt-canticle', id: '10',  title: 'NT Canticle (Rev 11:17-18; 12:10-12)',             defaultTone: '8.G' },
      ]},
    },
    // Friday — 3H6 (OCO: Ps 51 | Ps 119 | Ps 100 / Vespers: Ps 135, Deut 32)
    5: {
      lauds: { units: [
        { type: 'psalm',       id: '51',  title: 'Psalm 51',                defaultTone: '4.E' },
        { type: 'ot-canticle', id: '17',  title: 'OT Canticle (Is 42)',     defaultTone: '4.E' },
        { type: 'psalm',       id: '100', title: 'Psalm 100',               defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '135', title: 'Psalm 135',               defaultTone: '1.D', verses: '1-12' },
        { type: 'psalm',       id: '135', title: 'Psalm 135 (cont.)',       defaultTone: '1.D', verses: '13-21' },
        { type: 'nt-canticle', id: '11',  title: 'NT Canticle (Rev 15:3-4)',            defaultTone: '1.D' },
      ]},
    },
    // Saturday — 3H7 (OCO: Ps 63 | Wis 9 | Ps 117 / Vespers: Ps 110, Ps 114, Rev 19)
    6: {
      lauds: { units: [
        { type: 'psalm',       id: '63',  title: 'Psalm 63',                defaultTone: '8.G' },
        { type: 'ot-canticle', id: '18',  title: 'OT Canticle (Wis 9:10)', defaultTone: '8.G' },
        { type: 'psalm',       id: '117', title: 'Psalm 117',               defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',               defaultTone: '1.D' },
        { type: 'psalm',       id: '114', title: 'Psalm 114',               defaultTone: '1.D' },
        { type: 'nt-canticle', id: '7',   title: 'NT Canticle (1 Tim 3:16)',    defaultTone: '8.G' },
      ]},
    },
  },

  // ═══════════════════════════════════════════════════════
  // WEEK 4
  // ═══════════════════════════════════════════════════════
  4: {
    // Sunday — 4H1 (OCO: Ps 118 | Dan 3:57 | Ps 150)
    0: {
      lauds: { units: [
        { type: 'psalm',       id: '118', title: 'Psalm 118',               defaultTone: '8.G' },
        { type: 'ot-canticle', id: '1',   title: 'OT Canticle (Dan 3)',     defaultTone: '8.G' },
        { type: 'psalm',       id: '150', title: 'Psalm 150',               defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',               defaultTone: '1.D' },
        { type: 'psalm',       id: '111', title: 'Psalm 111',               defaultTone: '1.D' },
        { type: 'nt-canticle', id: '12',   title: 'NT Canticle (Rev 19)',    defaultTone: '8.G' },
      ]},
    },
    // Monday — 4H2 (OCO: Ps 90 | Is 42 | Ps 135 / Vespers: Ps 136, Ps 111)
    1: {
      lauds: { units: [
        { type: 'psalm',       id: '90',  title: 'Psalm 90',                defaultTone: '1.D' },
        { type: 'ot-canticle', id: '19',  title: 'OT Canticle (Is 42)',     defaultTone: '1.D' },
        { type: 'psalm',       id: '135', title: 'Psalm 135',               defaultTone: '1.D', verses: '1-12' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '136', title: 'Psalm 136',               defaultTone: '8.G' },
        { type: 'psalm',       id: '111', title: 'Psalm 111',               defaultTone: '8.G' },
        { type: 'nt-canticle', id: '4',   title: 'NT Canticle (Eph 1:3-10)',     defaultTone: '8.G' },
      ]},
    },
    // Tuesday — 4H3 (OCO: Ps 27 | Ps 51 | Ps 144 / Vespers: Ps 137, Ps 138)
    2: {
      lauds: { units: [
        { type: 'psalm',       id: '27',  title: 'Psalm 27',                defaultTone: '4.E' },
        { type: 'ot-canticle', id: '20',  title: 'OT Canticle (Ez 36)',     defaultTone: '4.E' },
        { type: 'psalm',       id: '144', title: 'Psalm 144',               defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '137', title: 'Psalm 137',               defaultTone: '2.D' },
        { type: 'psalm',       id: '138', title: 'Psalm 138',               defaultTone: '2.D' },
        { type: 'nt-canticle', id: '9',   title: 'NT Canticle (Rev 4:11; 5:9-12)',     defaultTone: '2.D' },
      ]},
    },
    // Wednesday — 4H4 (OCO: Ps 108 | Is 62 | Ps 146 / Vespers: Ps 139, Ps 139b)
    3: {
      lauds: { units: [
        { type: 'psalm',       id: '107', title: 'Psalm 107',               defaultTone: '7.c' },
        { type: 'ot-canticle', id: '21',  title: 'OT Canticle (Is 61:10)', defaultTone: '7.c' },
        { type: 'psalm',       id: '146', title: 'Psalm 146',               defaultTone: '7.c' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '139', title: 'Psalm 139',               defaultTone: '8.G', verses: '1-12' },
        { type: 'psalm',       id: '139', title: 'Psalm 139 (cont.)',       defaultTone: '8.G', verses: '13-24' },
        { type: 'nt-canticle', id: '6',   title: 'NT Canticle (Col 1:12-20)',     defaultTone: '8.G' },
      ]},
    },
    // Thursday — 4H5 (OCO: Ps 143 | Is 66 | Ps 147 / Vespers: Ps 144, Ps 144b)
    4: {
      lauds: { units: [
        { type: 'psalm',       id: '143',  title: 'Psalm 143',              defaultTone: '2.D' },
        { type: 'ot-canticle', id: '22',   title: 'OT Canticle (Is 66)',   defaultTone: '2.D' },
        { type: 'psalm',       id: '147A', title: 'Psalm 147A',             defaultTone: '2.D' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '144', title: 'Psalm 144',               defaultTone: '8.G', verses: '1-8' },
        { type: 'psalm',       id: '144', title: 'Psalm 144 (cont.)',       defaultTone: '8.G', verses: '9-15' },
        { type: 'nt-canticle', id: '10',   title: 'NT Canticle (Rev 11:17-18; 12:10-12)',    defaultTone: '8.G' },
      ]},
    },
    // Friday — 4H6 (OCO: Ps 51 | Ps 147 | Ps 147B / Vespers: Ps 145, Ps 145b)
    5: {
      lauds: { units: [
        { type: 'psalm',       id: '51',   title: 'Psalm 51',               defaultTone: '4.E' },
        { type: 'ot-canticle', id: '23',   title: 'OT Canticle',           defaultTone: '4.E' },
        { type: 'psalm',       id: '147B', title: 'Psalm 147B',             defaultTone: '4.E' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '145', title: 'Psalm 145',               defaultTone: '1.D', verses: '1-13' },
        { type: 'psalm',       id: '145', title: 'Psalm 145 (cont.)',       defaultTone: '1.D', verses: '14-21' },
        { type: 'nt-canticle', id: '11',   title: 'NT Canticle (Rev 15:3-4)',    defaultTone: '1.D' },
      ]},
    },
    // Saturday — 4H7 (OCO: Ps 92 | Ez 36 | Ps 8 / Vespers: Ps 110, Ps 114, Rev 19)
    6: {
      lauds: { units: [
        { type: 'psalm',       id: '92', title: 'Psalm 92',                 defaultTone: '8.G' },
        { type: 'ot-canticle', id: '24', title: 'OT Canticle (Ez 36:26)', defaultTone: '8.G' },
        { type: 'psalm',       id: '8',  title: 'Psalm 8',                  defaultTone: '8.G' },
      ]},
      vespers: { units: [
        { type: 'psalm',       id: '110', title: 'Psalm 110',               defaultTone: '1.D' },
        { type: 'psalm',       id: '114', title: 'Psalm 114',               defaultTone: '1.D' },
        { type: 'nt-canticle', id: '8',   title: 'NT Canticle (1 Pet 2:21-24)',    defaultTone: '8.G' },
      ]},
    },
  },
};
