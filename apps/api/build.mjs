// Bundles the API (and the workspace's shared package) into one ESM file.
// Third-party dependencies stay external and are installed in the production image.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(join(import.meta.dirname, 'package.json'), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@tally/'));

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external,
  logLevel: 'info',
});
