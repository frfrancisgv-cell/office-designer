/**
 * constants.ts
 *
 * Shared liturgical constants for the iBreviary API route:
 *   - FEAST_CALENDAR: date codes → feast name overrides
 *   - ORDINALS / DAY_TO_FERIA: English word → number maps for deriveContext()
 *   - mapRomcalToOccasion(): romcal event name → OCO occasion code
 */

// ── Feast Calendar ─────────────────────────────────────────────────────────────
// Maps "day/month" date codes to English feast names.
// These dates have specific entries in OCO (INDEX_HYM2.json / IDX_ANT.csv).
// Used to override iBreviary's generic ferial name with the proper feast title.
export const FEAST_CALENDAR: Record<string, string> = {
  '1/5':   'Saint Joseph the Worker',
  '1/11':  'All Saints',
  '2/2':   'Presentation of the Lord',
  '2/10':  'Guardian Angels',
  '3/5':   'Saints Philip and James, Apostles',
  '3/7':   'Saint Thomas the Apostle',
  '3/9':   'Saint Gregory the Great',
  '4/10':  'Saint Francis of Assisi',
  '6/8':   'Transfiguration of the Lord',
  '7/10':  'Our Lady of the Rosary',
  '7/12':  'Saint Ambrose',
  '8/8':   'Saint Dominic, Priest',
  '8/9':   'Nativity of the Blessed Virgin Mary',
  '8/12':  'Immaculate Conception of the Blessed Virgin Mary',
  '10/8':  'Saint Lawrence, Deacon and Martyr',
  '11/6':  'Saint Barnabas, Apostle',
  '11/7':  'Saint Benedict, Abbot',
  '11/11': 'Saint Martin of Tours',
  '13/9':  'Saint John Chrysostom',
  '14/5':  'Saint Matthias, Apostle',
  '14/9':  'Exaltation of the Holy Cross',
  '15/8':  'Assumption of the Blessed Virgin Mary',
  '15/9':  'Our Lady of Sorrows',
  '15/10': 'Saint Teresa of Ávila',
  '18/10': 'Saint Luke, Evangelist',
  '18/11': 'Dedication of the Basilicas of Saints Peter and Paul',
  '19/3':  'Saint Joseph, Spouse of the Blessed Virgin Mary',
  '20/8':  'Saint Bernard',
  '21/1':  'Saint Agnes, Virgin and Martyr',
  '21/9':  'Saint Matthew, Apostle and Evangelist',
  '21/11': 'Presentation of the Blessed Virgin Mary',
  '22/2':  'Chair of Saint Peter, Apostle',
  '22/7':  'Saint Mary Magdalene',
  '22/8':  'Queenship of the Blessed Virgin Mary',
  '24/6':  'Birth of Saint John the Baptist',
  '24/8':  'Saint Bartholomew, Apostle',
  '25/1':  'Conversion of Saint Paul',
  '25/3':  'Annunciation of the Lord',
  '25/4':  'Saint Mark, Evangelist',
  '25/7':  'Saint James, Apostle',
  '26/7':  'Saints Joachim and Anne',
  '26/12': 'Saint Stephen, First Martyr',
  '27/12': 'Saint John, Apostle and Evangelist',
  '28/12': 'Holy Innocents, Martyrs',
  '28/8':  'Saint Augustine of Hippo, Bishop and Doctor',
  '28/10': 'Saints Simon and Jude, Apostles',
  '29/4':  'Saint Catherine of Siena',
  '29/6':  'Saints Peter and Paul, Apostles',
  '29/7':  'Saint Martha',
  '29/8':  'Martyrdom of Saint John the Baptist',
  '29/9':  'Saints Michael, Gabriel, and Raphael, Archangels',
  '30/9':  'Saint Jerome, Priest and Doctor',
  '30/11': 'Saint Andrew, Apostle',
  '31/5':  'Visitation of the Blessed Virgin Mary',
  '31/7':  'Saint Ignatius of Loyola',
};

// ── Ordinal word → number ─────────────────────────────────────────────────────
export const ORDINALS: Record<string, number> = {
  first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8,
  ninth:9, tenth:10, eleventh:11, twelfth:12, thirteenth:13, fourteenth:14,
  fifteenth:15, sixteenth:16, seventeenth:17, eighteenth:18, nineteenth:19,
  twentieth:20, 'twenty-first':21, 'twenty-second':22, 'twenty-third':23,
  'twenty-fourth':24, 'twenty-fifth':25, 'twenty-sixth':26, 'twenty-seventh':27,
  'twenty-eighth':28, 'twenty-ninth':29, 'thirtieth':30, 'thirty-first':31,
  'thirty-second':32, 'thirty-third':33,
};

export const DAY_TO_FERIA: Record<string, number> = {
  monday:2, tuesday:3, wednesday:4, thursday:5, friday:6, saturday:7,
};

// ── Occasion code from romcal event name ──────────────────────────────────────
export function mapRomcalToOccasion(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('apostle') || n.includes('evangelist')) return 'Apost';
  if (n.includes('virgin')) return 'Virg';
  if (n.includes('martyr')) return 'Mart';
  if (n.includes('pastor') || n.includes('bishop') || n.includes('pope') || n.includes('priest')) return 'Past';
  if (n.includes('doctor')) return 'Doct';
  if (n.includes('mary') || n.includes('lady')) return 'BMV';
  return 'Sanct';
}
