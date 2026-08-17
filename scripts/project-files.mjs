import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ignored = new Set(['.git', '.vercel', 'node_modules', 'public', 'site', 'output', 'outputs', 'tmp']);

async function walk(directory, extension, root = directory, result = []) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, extension, root, result);
    else if (entry.isFile() && entry.name.endsWith(extension)) result.push(path.relative(root, absolute));
  }
  return result;
}

export async function projectFiles(extension) {
  try {
    return execFileSync('git', ['ls-files', `*${extension}`], { encoding: 'utf8' })
      .split('\n').filter(Boolean).filter((file) => !ignored.has(file.split('/')[0]));
  } catch {
    return walk(process.cwd(), extension);
  }
}
