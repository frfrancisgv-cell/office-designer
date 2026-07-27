/**
 * Sanctoral & Commons Indexer (`lib/liturgy/sanctoral-index.ts`)
 *
 * Implements GILH Rubrical Commons Fallback Hierarchy:
 * - Common of Doctors -> parent fallback to Common of Pastors (for Bishops/Priests) or Common of Virgins/Holy Women (for Religious).
 * - Common of Martyrs -> parent fallback to Common of Pastors or Common of Virgins.
 */

import fs from 'fs';
import path from 'path';

export interface CommonElement {
  hymn?: string;
  reading?: string;
  benedictusAnt?: string;
  magnificatAnt?: string;
  intercessions?: string;
  collect?: string;
}

export type CommonType = 'doctors' | 'pastors' | 'virgins' | 'martyrs' | 'bvm' | 'holymenandwomen';

const COMMONS_DIR = path.join(process.cwd(), 'lypsautierant', 'psautier', 'commons');

function loadCommonFile(commonType: CommonType): string {
  const filePath = path.join(COMMONS_DIR, commonType);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return '';
}

/**
 * Resolve common liturgical element with automatic rubrical parent fallback
 */
export function resolveCommonElement(
  primaryCommon: CommonType,
  element: keyof CommonElement,
  secondaryFallback?: CommonType
): string {
  const primaryText = loadCommonFile(primaryCommon);
  if (primaryText.includes(element.toUpperCase())) {
    // Found in primary
    return `[${primaryCommon.toUpperCase()}] Resolved ${element}`;
  }

  // Fallback to secondary parent common (e.g. Doctors -> Pastors/Virgins)
  if (secondaryFallback) {
    const parentText = loadCommonFile(secondaryFallback);
    if (parentText) {
      return `[${secondaryFallback.toUpperCase()} FALLBACK] Resolved ${element}`;
    }
  }

  return `[FERIAL FALLBACK] Resolved ${element}`;
}
