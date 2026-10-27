import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Build inputs and server functions stay outside the static publish directory.
export const publicDirectories = [
  'admin', 'akademik', 'asrama', 'assets', 'berita', 'carian', 'hem', 'hub',
  'info', 'info-sekolah', 'kokurikulum', 'log-masuk', 'menu',
  'offline', 'perkhidmatan', 'profil', 'program', 'pss', 'takwim', 'tempahan'
];
export const optionalPublicDirectories = ['kehadiran'];
export const publicFiles = [
  'index.html', 'apple-touch-icon.png', 'favicon.ico', 'favicon.png', 'logo.png',
  'manifest.json', 'robots.txt', 'sitemap.xml', 'sw.js'
];
const publicExtensions = new Set([
  '.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.pdf',
  '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.ico', '.gif',
  '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.wav', '.ogg', '.mp4', '.webm'
]);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function buildPublic(root = repositoryRoot) {
  const output = path.join(root, 'site');
  const existing = await fs.lstat(output).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (existing?.isSymbolicLink()) throw new Error('Public output must not be a symbolic link.');
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  let files = 0;

  async function copy(relative) {
    const source = path.join(root, relative);
    const stat = await fs.lstat(source);
    if (stat.isSymbolicLink()) throw new Error('Symbolic link in public input: ' + relative);
    if (path.basename(relative).startsWith('.')) throw new Error('Hidden public input: ' + relative);
    const destination = path.join(output, relative);
    if (stat.isDirectory()) {
      await fs.mkdir(destination, { recursive: true });
      for (const name of (await fs.readdir(source)).sort()) await copy(path.join(relative, name));
    } else if (stat.isFile() && publicExtensions.has(path.extname(relative).toLowerCase())) {
      await fs.copyFile(source, destination);
      files += 1;
    } else {
      throw new Error('Unsupported public input: ' + relative);
    }
  }

  for (const entry of [...publicFiles, ...publicDirectories]) await copy(entry);
  for (const entry of optionalPublicDirectories) {
    const stat = await fs.lstat(path.join(root, entry)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (stat) await copy(entry);
  }
  console.log('Public build: ' + files + ' files in site/');
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPublic();
