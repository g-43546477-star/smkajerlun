import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { projectFiles } from './project-files.mjs';

const files = await projectFiles('.js');
const syntaxFailures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) syntaxFailures.push(`${file}\n${result.stderr.trim()}`);
}
if (syntaxFailures.length) {
  console.error(syntaxFailures.join('\n\n'));
  process.exit(1);
}

const eslint = path.resolve('node_modules/.bin/eslint');
if (fs.existsSync(eslint)) {
  const result = spawnSync(eslint, ['--no-warn-ignored', ...files], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`JS lint passed: ${files.length} files`);
