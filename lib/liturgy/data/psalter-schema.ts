/**
 * 4-Week Psalter Schema (General Instruction of the Liturgy of the Hours - GILH)
 *
 * Psalm and Canticle assignments for Weeks 1, 2, 3, and 4 across:
 * - Lauds (Morning Prayer): Psalm 1 (Morning), OT Canticle, Psalm 2 (Praise)
 * - Vespers (Evening Prayer): Psalm 1, Psalm 2, NT Canticle
 * - Compline (Night Prayer): Night Psalms
 */

export interface PsalmodiaUnit {
  type: 'psalm' | 'ot-canticle' | 'nt-canticle';
  id: string; // e.g. "63", "ot-1", "149", "116A", "119.1-8"
  title: string;
  defaultAntiphonEn?: string;
  defaultAntiphonLa?: string;
  defaultTone?: string;
}

export interface HourPsalterAssignment {
  units: [PsalmodiaUnit, PsalmodiaUnit, PsalmodiaUnit];
}

// ── Compline Fixed Night Psalms ──────────────────────────────────────────────
export const COMPLINE_PSALMS: Record<string, PsalmodiaUnit[]> = {
  sunday1: [
    { type: 'psalm', id: '4', title: 'Psalm 4', defaultAntiphonEn: 'Have mercy on me, Lord, and hear my prayer.', defaultTone: '8.G' },
    { type: 'psalm', id: '134', title: 'Psalm 134', defaultAntiphonEn: 'O bless the Lord, all you servants of the Lord.', defaultTone: '8.G' },
  ],
  sunday2: [
    { type: 'psalm', id: '91', title: 'Psalm 91', defaultAntiphonEn: 'He will conceal you with his wings; you will not fear the terror of the night.', defaultTone: '8.G' },
  ],
  monday: [
    { type: 'psalm', id: '86', title: 'Psalm 86', defaultAntiphonEn: 'Lord, turn your ear to me and hear me; save your servant who trusts in you.', defaultTone: '8.G' },
  ],
  tuesday: [
    { type: 'psalm', id: '143', title: 'Psalm 143', defaultAntiphonEn: 'Do not hide your face from me, for in you I put my trust.', defaultTone: '8.G' },
  ],
  wednesday: [
    { type: 'psalm', id: '31', title: 'Psalm 31', defaultAntiphonEn: 'Be a rock of refuge for me, O Lord, a mighty stronghold to save me.', defaultTone: '8.G' },
    { type: 'psalm', id: '130', title: 'Psalm 130', defaultAntiphonEn: 'Out of the depths I cry to you, O Lord; Lord, hear my voice!', defaultTone: '8.G' },
  ],
  thursday: [
    { type: 'psalm', id: '16', title: 'Psalm 16', defaultAntiphonEn: 'Keep me safe, O God; you are my hope.', defaultTone: '8.G' },
  ],
  friday: [
    { type: 'psalm', id: '88', title: 'Psalm 88', defaultAntiphonEn: 'Day and night I cry to you, my God.', defaultTone: '8.G' },
  ],
  saturday: [
    { type: 'psalm', id: '4', title: 'Psalm 4', defaultAntiphonEn: 'Have mercy on me, Lord, and hear my prayer.', defaultTone: '8.G' },
    { type: 'psalm', id: '134', title: 'Psalm 134', defaultAntiphonEn: 'O bless the Lord, all you servants of the Lord.', defaultTone: '8.G' },
  ],
};

// ── 4-Week Psalter Schema for Lauds and Vespers ──────────────────────────────
export const PSALTER_SCHEMA: Record<number, Record<number, { lauds: HourPsalterAssignment; vespers: HourPsalterAssignment }>> = {
  // ── WEEK 1 ────────────────────────────────────────────────────────────────
  1: {
    // Sunday
    0: {
      lauds: {
        units: [
          { type: 'psalm', id: '63', title: 'Psalm 63', defaultTone: '8.G' },
          { type: 'ot-canticle', id: '1', title: 'OT 1 (Dan 3:57-88)', defaultTone: '8.G' },
          { type: 'psalm', id: '149', title: 'Psalm 149', defaultTone: '8.G' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '110', title: 'Psalm 110', defaultTone: '1.D' },
          { type: 'psalm', id: '114', title: 'Psalm 114', defaultTone: '1.D' },
          { type: 'nt-canticle', id: '1', title: 'NT 1 (Rev 19:1-7)', defaultTone: '8.G' },
        ],
      },
    },
    // Monday
    1: {
      lauds: {
        units: [
          { type: 'psalm', id: '5', title: 'Psalm 5', defaultTone: '1.D' },
          { type: 'ot-canticle', id: '2', title: 'OT 2 (1 Chr 29:10-13)', defaultTone: '1.D' },
          { type: 'psalm', id: '29', title: 'Psalm 29', defaultTone: '1.D' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '11', title: 'Psalm 11', defaultTone: '8.G' },
          { type: 'psalm', id: '15', title: 'Psalm 15', defaultTone: '8.G' },
          { type: 'nt-canticle', id: '2', title: 'NT 2 (Eph 1:3-10)', defaultTone: '8.G' },
        ],
      },
    },
    // Tuesday
    2: {
      lauds: {
        units: [
          { type: 'psalm', id: '24', title: 'Psalm 24', defaultTone: '4.E' },
          { type: 'ot-canticle', id: '3', title: 'OT 3 (Tob 13:2-8)', defaultTone: '4.E' },
          { type: 'psalm', id: '33', title: 'Psalm 33', defaultTone: '4.E' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '20', title: 'Psalm 20', defaultTone: '2.D' },
          { type: 'psalm', id: '21', title: 'Psalm 21', defaultTone: '2.D' },
          { type: 'nt-canticle', id: '3', title: 'NT 3 (Rev 4:11; 5:9-12)', defaultTone: '2.D' },
        ],
      },
    },
    // Wednesday
    3: {
      lauds: {
        units: [
          { type: 'psalm', id: '67', title: 'Psalm 67', defaultTone: '7.c' },
          { type: 'ot-canticle', id: '4', title: 'OT 4 (Isa 2:2-5)', defaultTone: '7.c' },
          { type: 'psalm', id: '96', title: 'Psalm 96', defaultTone: '7.c' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '27.1-6', title: 'Psalm 27:1-6', defaultTone: '8.G' },
          { type: 'psalm', id: '27.7-14', title: 'Psalm 27:7-14', defaultTone: '8.G' },
          { type: 'nt-canticle', id: '4', title: 'NT 4 (Col 1:12-20)', defaultTone: '8.G' },
        ],
      },
    },
    // Thursday
    4: {
      lauds: {
        units: [
          { type: 'psalm', id: '80', title: 'Psalm 80', defaultTone: '2.D' },
          { type: 'ot-canticle', id: '5', title: 'OT 5 (Isa 12:1-6)', defaultTone: '2.D' },
          { type: 'psalm', id: '81', title: 'Psalm 81', defaultTone: '2.D' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '30', title: 'Psalm 30', defaultTone: '8.G' },
          { type: 'psalm', id: '32', title: 'Psalm 32', defaultTone: '8.G' },
          { type: 'nt-canticle', id: '5', title: 'NT 5 (Rev 11:17-18; 12:10-12)', defaultTone: '8.G' },
        ],
      },
    },
    // Friday
    5: {
      lauds: {
        units: [
          { type: 'psalm', id: '51', title: 'Psalm 51', defaultTone: '4.E' },
          { type: 'ot-canticle', id: '6', title: 'OT 6 (Hab 3:2-19)', defaultTone: '4.E' },
          { type: 'psalm', id: '147A', title: 'Psalm 147A', defaultTone: '4.E' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '41', title: 'Psalm 41', defaultTone: '1.D' },
          { type: 'psalm', id: '46', title: 'Psalm 46', defaultTone: '1.D' },
          { type: 'nt-canticle', id: '6', title: 'NT 6 (Rev 15:3-4)', defaultTone: '1.D' },
        ],
      },
    },
    // Saturday
    6: {
      lauds: {
        units: [
          { type: 'psalm', id: '92', title: 'Psalm 92', defaultTone: '8.G' },
          { type: 'ot-canticle', id: '7', title: 'OT 7 (Deut 32:1-12)', defaultTone: '8.G' },
          { type: 'psalm', id: '8', title: 'Psalm 8', defaultTone: '8.G' },
        ],
      },
      vespers: {
        units: [
          { type: 'psalm', id: '110', title: 'Psalm 110', defaultTone: '1.D' },
          { type: 'psalm', id: '114', title: 'Psalm 114', defaultTone: '1.D' },
          { type: 'nt-canticle', id: '1', title: 'NT 1 (Rev 19:1-7)', defaultTone: '8.G' },
        ],
      },
    },
  },
};
