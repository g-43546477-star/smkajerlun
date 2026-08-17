import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { projectFiles } from './project-files.mjs';

const files = await projectFiles('.html');
const scriptFiles = await projectFiles('.js');
const paths = new Set(['/']);
const attribute = /(?:href|src)=["']([^"']+)["']/gi;
for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  for (const match of source.matchAll(attribute)) paths.add(match[1]);
}
const scriptReference = /(?:href|src|url|path|route|destination|to|location\.href)\s*(?::|=)\s*[`'\"](\/[^`'\"\s]*)[`'\"]/gi;
for (const file of scriptFiles) {
  const source = await fs.readFile(file, 'utf8');
  for (const match of source.matchAll(scriptReference)) paths.add(match[1]);
}
const local = [...paths].filter((value) => value.startsWith('/') && !value.startsWith('//'))
  .map((value) => value.split('#')[0].split('?')[0]).filter(Boolean);
const unique = [...new Set(local)];
const { server, url } = await startStaticServer();
const failures = [];
const routeOwners = new Map();
for (const file of files) {
  const directory = path.posix.dirname(file);
  const route = directory === '.' ? '/' : `/${directory}/`;
  if (routeOwners.has(route)) failures.push(`duplicate route ${route}: ${routeOwners.get(route)}, ${file}`);
  else routeOwners.set(route, file);
}
const staleClinicRoute = /["'`]\/klinik\/["'`]|["'`]\/perkhidmatan\/rekod-klinik\/["'`]|https:\/\/www\.smkajerlun\.my\/klinik\//;
for (const file of [...files, ...scriptFiles, 'sitemap.xml']) {
  try {
    const source = await fs.readFile(file, 'utf8');
    if (staleClinicRoute.test(source)) failures.push(`stale clinic route reference in ${file}`);
  } catch {
    // sitemap.xml is optional for local route verification.
  }
}
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
