/**
 * Runs lualatex in a temporary directory and returns the resulting PDF as a Buffer.
 *
 * Requirements on the server:
 *   - lualatex  (TeX Live: texlive-luatex or texlive-full)
 *   - gregorio  (for gregoriotex GABC compilation; part of texlive-music or standalone)
 *   - gregoriotex LaTeX package  (texlive-music or CTAN)
 *
 * Install on Debian/Ubuntu:
 *   sudo apt-get install texlive-luatex texlive-fonts-recommended \
 *        texlive-lang-latin texlive-music
 *   # The `gregorio` binary is bundled with gregoriotex in modern TeX Live.
 */

import { execFile } from 'child_process';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LatexJob {
  texContent: string;
  /** Map of filename → content for auxiliary files (e.g. .gabc scores) */
  auxFiles: Record<string, string>;
  /**
   * Map of filename → base64 payload for binary files (uploaded score
   * images). Kept apart from auxFiles so precompileGabc never sees them.
   */
  binaryFiles?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Subprocess helpers
// ---------------------------------------------------------------------------

/**
 * Run a single lualatex pass. Throws with captured log on failure.
 */
async function runLuaLatex(cwd: string, texFile: string): Promise<void> {
  try {
    await execFileAsync(
      '/usr/bin/lualatex',
      [
        '--interaction=nonstopmode',
        '--halt-on-error',
        texFile,
      ],
      {
        cwd,
        timeout: 90_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' },
      },
    );
  } catch (err: unknown) {
    // Attach the lualatex log file content for easier debugging
    let logContent = '';
    try {
      const logFile = join(cwd, texFile.replace(/\.tex$/, '.log'));
      logContent = await readFile(logFile, 'utf8');
    } catch {
      // log file may not exist
    }
    const message =
      err instanceof Error ? err.message : String(err);
    throw new Error(`lualatex pass failed: ${message}\n\n--- lualatex log ---\n${logContent.slice(-4000)}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pre-compile all .gabc files in auxFiles to .gtex using gregorio.
 * Runs before lualatex so \greincludescore can find the .gtex files.
 */
async function precompileGabc(tmpDir: string, auxFiles: Record<string, string>): Promise<void> {
  const gabcNames = Object.keys(auxFiles).filter((f) => f.endsWith('.gabc'));
  await Promise.all(
    gabcNames.map((filename) =>
      execFileAsync('/usr/local/bin/gregorio', [filename], {
        cwd: tmpDir,
        timeout: 30_000,
        env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' },
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`gregorio failed for ${filename}: ${msg}`);
      }),
    ),
  );
}

/**
 * Write all files to a temp dir, run two lualatex passes, return the PDF.
 * The temp directory is always cleaned up regardless of success/failure.
 */
export async function renderPdf(job: LatexJob): Promise<Buffer> {
  // Use /tmp directly to avoid inheriting a sandbox-scoped TMPDIR that may not
  // exist in the production pm2 process environment.
  const systemTmp = process.env.OFFICE_TMPDIR ?? '/tmp';
  const tmpDir = await mkdtemp(join(systemTmp, 'office-pdf-'));

  try {
    // Write auxiliary files (.gabc scores, etc.)
    await Promise.all([
      ...Object.entries(job.auxFiles).map(([filename, content]) =>
        writeFile(join(tmpDir, filename), content, 'utf8'),
      ),
      ...Object.entries(job.binaryFiles ?? {}).map(([filename, base64]) =>
        writeFile(join(tmpDir, filename), base64, 'base64'),
      ),
    ]);

    // Write the main .tex file
    const texFile = 'office.tex';
    await writeFile(join(tmpDir, texFile), job.texContent, 'utf8');

    // Pre-compile GABC scores to .gtex before invoking lualatex
    await precompileGabc(tmpDir, job.auxFiles);

    // Single lualatex pass (we have no TOC or \pageref)
    await runLuaLatex(tmpDir, texFile);

    // Read and return the PDF
    const pdfPath = join(tmpDir, 'office.pdf');
    return await readFile(pdfPath);
  } finally {
    // Best-effort cleanup
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Returns the lualatex and gregorio version strings, or an error message.
 * Useful for surfacing configuration issues in the UI.
 */
export async function checkLatexInstall(): Promise<{ lualatex: string | null; gregorio: string | null; error?: string }> {
  const get = async (cmd: string, args: string[]): Promise<string | null> => {
    try {
      const { stdout } = await execFileAsync(cmd, args, {
        timeout: 5000,
        env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' },
      });
      return stdout.trim().split('\n')[0];
    } catch {
      return null;
    }
  };

  const [lualatex, gregorio] = await Promise.all([
    get('/usr/bin/lualatex', ['--version']),
    get('/usr/local/bin/gregorio', ['--version']),
  ]);

  const error =
    !lualatex && !gregorio
      ? 'Neither lualatex nor gregorio were found on PATH.'
      : !lualatex
        ? 'lualatex not found on PATH.'
        : !gregorio
          ? 'gregorio not found on PATH (GABC scores will not render).'
          : undefined;

  return { lualatex, gregorio, error };
}
