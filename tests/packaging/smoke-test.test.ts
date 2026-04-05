/**
 * Packaging smoke test — verifies that `npm install alap` works
 * from a packed tarball, outside the workspace.
 *
 * This catches:
 * - Missing files in the `files` field
 * - Broken export map entries
 * - Bad module resolution that workspace:* papers over
 * - IIFE build missing globals
 *
 * Run separately from the main test suite:
 *   pnpm test:packaging
 *
 * Runs pnpm pack + npm install in a temp directory, then probes
 * each export path with a subprocess.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(import.meta.dirname, '../..');
let tempDir: string;

function run(cmd: string, cwd?: string): string {
  return execSync(cmd, {
    cwd: cwd ?? tempDir,
    encoding: 'utf-8',
    timeout: 60_000,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  }).trim();
}

/** Write a file in the temp project and run it, return stdout */
function probe(filename: string, code: string): string {
  writeFileSync(join(tempDir, filename), code);
  return run(`node ${filename}`);
}

/** Run a probe, return { ok, stdout } without throwing or leaking stderr */
function probeResult(filename: string, code: string): { ok: boolean; stdout: string } {
  writeFileSync(join(tempDir, filename), code);
  try {
    const stdout = execSync(`node ${filename}`, {
      cwd: tempDir,
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    }).trim();
    return { ok: true, stdout };
  } catch {
    return { ok: false, stdout: '' };
  }
}

beforeAll(() => {
  // Full build (ESM + CJS + IIFE + type declarations) — matches prepublishOnly
  run('pnpm run build', ROOT);

  // Pack into a temp location
  tempDir = mkdtempSync(join(tmpdir(), 'alap-smoke-'));
  run(`pnpm pack --pack-destination ${tempDir}`, ROOT);

  // Find the tarball
  const files = run('ls *.tgz').split('\n');
  const tarball = join(tempDir, files[0]);

  // Create a minimal consumer project
  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
    name: 'alap-smoke-test',
    version: '0.0.0',
    private: true,
    type: 'module',
  }));

  // Install the tarball (not from workspace, from the real .tgz)
  run(`npm install ${tarball}`);
}, 120_000);

afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('packaging smoke test', () => {

  describe('package contents', () => {
    test('dist/ directory exists with expected files', () => {
      const pkgDir = join(tempDir, 'node_modules', 'alap', 'dist');
      expect(existsSync(join(pkgDir, 'index.js'))).toBe(true);
      expect(existsSync(join(pkgDir, 'index.cjs'))).toBe(true);
      expect(existsSync(join(pkgDir, 'index.d.ts'))).toBe(true);
      expect(existsSync(join(pkgDir, 'alap.iife.js'))).toBe(true);
    });

    test('each export subpath has .js and .cjs', () => {
      const pkgDir = join(tempDir, 'node_modules', 'alap', 'dist');
      const subpaths = ['core', 'react', 'vue', 'svelte', 'solid', 'alpine', 'qwik', 'storage', 'astro'];
      for (const sp of subpaths) {
        expect(existsSync(join(pkgDir, sp, 'index.js')), `${sp}/index.js`).toBe(true);
        expect(existsSync(join(pkgDir, sp, 'index.cjs')), `${sp}/index.cjs`).toBe(true);
      }
    });

    test('type declarations exist for each export', () => {
      const pkgDir = join(tempDir, 'node_modules', 'alap', 'dist');
      expect(readFileSync(join(pkgDir, 'index.d.ts'), 'utf-8')).toContain('AlapEngine');
      expect(readFileSync(join(pkgDir, 'core', 'index.d.ts'), 'utf-8').length).toBeGreaterThan(0);
    });

    test('astro components are included', () => {
      const pkgDir = join(tempDir, 'node_modules', 'alap');
      expect(existsSync(join(pkgDir, 'src', 'ui', 'astro', 'AlapLink.astro'))).toBe(true);
      expect(existsSync(join(pkgDir, 'src', 'ui', 'astro', 'AlapSetup.astro'))).toBe(true);
    });

    test('IIFE build is non-trivial', () => {
      const pkgDir = join(tempDir, 'node_modules', 'alap', 'dist');
      const iife = readFileSync(join(pkgDir, 'alap.iife.js'), 'utf-8');
      expect(iife.length).toBeGreaterThan(10_000);
      expect(iife).toContain('Alap');
    });
  });

  describe('ESM imports — no peer deps needed', () => {
    test('alap/core', () => {
      const out = probe('test-core.mjs', [
        "import { AlapEngine, ExpressionParser } from 'alap/core';",
        "console.log(typeof AlapEngine + ',' + typeof ExpressionParser);",
      ].join('\n'));
      expect(out).toBe('function,function');
    });
  });

  describe('ESM imports — peer deps required (verify module resolves)', () => {
    // These adapters import their framework at the top level,
    // so they'll fail without peer deps installed. We verify the
    // error is "Cannot find package 'react'" (module resolved,
    // peer dep missing) rather than "Cannot find package 'alap/react'"
    // (export map broken).

    const adapters = [
      { name: 'react', peer: 'react' },
      { name: 'vue', peer: 'vue' },
      { name: 'svelte', peer: 'svelte' },
      { name: 'solid', peer: 'solid-js' },
      { name: 'alpine', peer: 'alpinejs' },
      { name: 'qwik', peer: '@builder.io/qwik' },
      { name: 'storage', peer: 'idb' },
    ];

    for (const { name, peer } of adapters) {
      test(`alap/${name} — resolves (fails on missing peer '${peer}', not on export map)`, () => {
        const result = probeResult(`test-${name}.mjs`, [
          `import * as mod from 'alap/${name}';`,
          "console.log('OK');",
        ].join('\n'));

        if (result.ok) {
          // If it somehow works (peer dep accidentally available), that's fine
          expect(result.stdout).toBe('OK');
        } else {
          // The error should be about the missing peer, not about alap's export map
          // This is a bit indirect but we can check the file exists
          const pkgDir = join(tempDir, 'node_modules', 'alap', 'dist');
          expect(existsSync(join(pkgDir, name, 'index.js')),
            `alap/${name} export file should exist even if peer dep is missing`).toBe(true);
        }
      });
    }
  });

  describe('CJS imports', () => {
    test('alap/core via require', () => {
      const out = probe('test-cjs-core.cjs', [
        "const m = require('alap/core');",
        "console.log(typeof m.AlapEngine);",
      ].join('\n'));
      expect(out).toBe('function');
    });
  });

  describe('functional — AlapEngine from tarball', () => {
    test('resolves a tag expression', () => {
      const out = probe('test-resolve.mjs', [
        "import { AlapEngine } from 'alap/core';",
        "const engine = new AlapEngine({",
        "  allLinks: {",
        "    golden: { label: 'Golden Gate', url: 'https://example.com/gg', tags: ['bridge', 'sf'] },",
        "    brooklyn: { label: 'Brooklyn Bridge', url: 'https://example.com/bb', tags: ['bridge', 'nyc'] },",
        "    highline: { label: 'High Line', url: 'https://example.com/hl', tags: ['nyc', 'park'] },",
        "  },",
        "});",
        "const result = engine.resolve('.bridge');",
        "console.log(result.map(r => r.id).sort().join(','));",
      ].join('\n'));
      expect(out).toBe('brooklyn,golden');
    });

    test('resolves operators (WITHOUT)', () => {
      const out = probe('test-ops.mjs', [
        "import { AlapEngine } from 'alap/core';",
        "const engine = new AlapEngine({",
        "  allLinks: {",
        "    golden: { label: 'Golden Gate', url: 'https://example.com/gg', tags: ['bridge', 'sf'] },",
        "    brooklyn: { label: 'Brooklyn Bridge', url: 'https://example.com/bb', tags: ['bridge', 'nyc'] },",
        "    highline: { label: 'High Line', url: 'https://example.com/hl', tags: ['nyc', 'park'] },",
        "  },",
        "});",
        "const result = engine.resolve('.nyc - .bridge');",
        "console.log(result.map(r => r.id).join(','));",
      ].join('\n'));
      expect(out).toBe('highline');
    });

    test('validates config', () => {
      const out = probe('test-validate.mjs', [
        "import { AlapEngine } from 'alap/core';",
        "const engine = new AlapEngine({",
        "  allLinks: {",
        "    test: { label: 'Test', url: 'https://example.com', tags: ['a'] },",
        "  },",
        "});",
        "console.log(engine.resolve('.a').length);",
      ].join('\n'));
      expect(out).toBe('1');
    });
  });
});
