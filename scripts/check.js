import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const dir of ['src', 'bin', 'public', 'test', 'scripts']) {
  for (const name of readdirSync(dir).filter(name => name.endsWith('.js'))) {
    const result = spawnSync(process.execPath, ['--check', `${dir}/${name}`], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(1);
  }
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!pkg.bin || !pkg.exports || !pkg.files) throw new Error('Package metadata is incomplete.');
console.log('Syntax and package metadata checks passed.');
