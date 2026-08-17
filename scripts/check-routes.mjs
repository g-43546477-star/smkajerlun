import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { projectFiles } from './project-files.mjs';

const files = await projectFiles('.html');
const paths = new Set(['/']);
const attribute = /(?:href|src)=["']([^"']+)["']/gi;
for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  for (const match of source.matchAll(attribute)) paths.add(match[1]);
}
const local = [...paths].filter((value) => value.startsWith('/') && !value.startsWith('//'))
  .map((value) => value.split('#')[0].split('?')[0]).filter(Boolean);
const unique = [...new Set(local)];
const { server, url } = await startStaticServer();
const failures = [];
for (const pathname of unique) {
  const response = await fetch(`${url}${pathname}`);
  if (response.status >= 400) failures.push(`${response.status} ${pathname}`);
}
server.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Route and asset check passed: ${unique.length} local paths`);
