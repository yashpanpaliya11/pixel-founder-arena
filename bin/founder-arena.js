#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createArena, startServer, runCommand, founders } from '../src/index.js';

const help = `
FOUNDER ARENA  /  pixel startup chaos, useful debugging hints

  founder-arena                          Open your local arena
  founder-arena demo                     Open the arena and play a sample error
  founder-arena run [options] -- COMMAND [ARGS...]
  founder-arena founders                 List all bundled characters

Options (place before --):
  --no-open              Print the local URL without opening a browser
  --port NUMBER          Local port (default: automatically assigned)
  --language en|hinglish Roast language; all other content stays English
  --intensity LEVEL      chill, funny, or savage
  --pack FILE            JSON array of custom characters and roast lines
  --state FILE           Progress/settings file (default: .founder-arena/state.json)
  --exit                 Close arena after the wrapped command ends; preserve exit code
  --help, -h             Show help
  --version, -v          Show version

Examples:
  founder-arena run --language hinglish -- node app.js
  founder-arena run -- npm test
  founder-arena run -- node --watch app.js

Runs locally with no API keys. Characters and dialogue are fictional parody.
The arena stays open after a command by default; Ctrl+C closes it.
`;

async function main() {
  const argv = process.argv.slice(2);
  const flags = argv.slice(0, argv.indexOf('--') < 0 ? argv.length : argv.indexOf('--'));
  if (flags.includes('--help') || flags.includes('-h')) { console.log(help); return; }
  if (argv[0] === '--version' || argv[0] === '-v') { console.log('1.2.0'); return; }
  let mode = 'serve';
  if (argv[0] && !argv[0].startsWith('-')) mode = argv.shift();
  if (!['serve', 'demo', 'run', 'founders'].includes(mode)) throw new Error(`Unknown command: ${mode}. Use --help.`);
  if (mode === 'founders') { console.table(founders.map(({ id, name, company, specialty }) => ({ id, name, company, specialty }))); return; }
  const options = { open: true, port: 0 };
  let command = [];
  while (argv.length) {
    const flag = argv.shift();
    if (flag === '--') { command = argv.splice(0); break; }
    if (flag === '--no-open') options.open = false;
    else if (flag === '--exit') options.exit = true;
    else if (['--port', '--language', '--intensity', '--pack', '--state'].includes(flag)) {
      const value = argv.shift();
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
      options[flag.slice(2)] = value;
    } else throw new Error(`Unknown option: ${flag}. Use --help.`);
  }
  if (!/^\d+$/.test(String(options.port)) || Number(options.port) > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  if (mode === 'run' && !command.length) throw new Error('Use run -- COMMAND [ARGS...].');
  if (mode !== 'run' && command.length) throw new Error('Commands after -- require run mode.');
  const customFounders = options.pack ? JSON.parse(await readFile(resolve(options.pack), 'utf8')) : [];
  const arena = createArena({ stateFile: resolve(options.state ?? '.founder-arena/state.json'), customFounders });
  const settings = {};
  if (options.language) settings.language = options.language;
  if (options.intensity) settings.intensity = options.intensity;
  if (Object.keys(settings).length) arena.updateSettings(settings);
  const service = await startServer(arena, { port: Number(options.port) });
  console.log(`\n  FOUNDER ARENA\n  ${service.url}\n  ${arena.founders.length} characters • offline • fictional parody\n  Ctrl+C to close\n`);
  if (arena.warning) console.warn(arena.warning);
  if (options.open) {
    let browser;
    if (process.platform === 'darwin') browser = spawn('open', [service.url], { detached: true, stdio: 'ignore' });
    else if (process.platform === 'win32') browser = spawn('rundll32', ['url.dll,FileProtocolHandler', service.url], { detached: true, stdio: 'ignore' });
    else browser = spawn('xdg-open', [service.url], { detached: true, stdio: 'ignore' });
    browser.on('error', () => console.log(`Open ${service.url} in a browser.`)); browser.unref();
  }
  let runner;
  let stopping = false;
  const stop = async signal => {
    if (stopping) return;
    stopping = true;
    if (runner) {
      runner.stop(signal);
      const killTimer = setTimeout(() => runner.stop('SIGKILL'), 2000); killTimer.unref();
      await runner.completion; clearTimeout(killTimer);
    }
    await service.close();
    process.exitCode = arena.status.exitCode ?? (signal === 'SIGINT' ? 0 : 143);
  };
  process.once('SIGINT', () => { stop('SIGINT').catch(e => { console.error(e.message); process.exitCode = 1; }); });
  process.once('SIGTERM', () => { stop('SIGTERM').catch(e => { console.error(e.message); process.exitCode = 1; }); });
  if (mode === 'demo') arena.reportError('SyntaxError: Unexpected token ")"\n    at example.js:12:8', { demo: true, force: true });
  if (mode === 'run') {
    try { runner = runCommand(arena, command[0], command.slice(1)); }
    catch (error) { await service.close(); throw error; }
    const code = await runner.completion;
    if (options.exit) { await service.close(); process.exitCode = code; }
    else console.log(`\nCommand finished (${code}). Arena remains open. Ctrl+C to close.\n`);
  }
}

main().catch(error => { console.error(`Founder Arena: ${error.message}`); process.exitCode = 1; });
