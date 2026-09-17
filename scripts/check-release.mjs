import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
try {
  if (git('status', '--porcelain', '--untracked-files=all')) {
    throw new Error('Commit the reviewed release files first. Working tree contains modified or untracked files.');
  }
  const head = git('rev-parse', 'HEAD');
  const remote = git('ls-remote', '--exit-code', 'origin', 'refs/heads/main').split(/\s+/)[0];
  if (head !== remote) throw new Error('HEAD does not match origin/main on the remote. Push the reviewed commit before release.');
  console.log(`Release source verified: ${head}. Deploy this commit; record its SHA and the resulting deployment ID.`);
} catch (error) {
  console.error(`Release blocked: ${error.message}`);
  process.exitCode = 1;
}
