import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { classifyError } from './errors.js';

/** Runs only the executable/arguments supplied by the local caller. No shell interpolation. */
export function runCommand(arena, command, args = [], { cwd = process.cwd(), stdout = process.stdout, stderr = process.stderr } = {}) {
  if (typeof command !== 'string' || !command) throw new Error('Provide an executable after --.');
  let executable = command;
  let argv = args;
  if (process.platform === 'win32' && /^(npm|npx)(\.cmd)?$/i.test(command)) {
    if (!process.env.npm_execpath) throw new Error('On Windows run through npm exec, or invoke a JavaScript CLI with node and its file path.');
    executable = process.execPath;
    argv = [command.toLowerCase().startsWith('npx') ? process.env.npm_execpath.replace(/npm-cli\.js$/, 'npx-cli.js') : process.env.npm_execpath, ...args];
  }
  const child = spawn(executable, argv, { cwd, stdio: ['inherit', 'pipe', 'pipe'], shell: false, detached: process.platform !== 'win32', env: process.env });
  arena.status = { running: true, command: [command, ...args].join(' '), exitCode: null };
  arena.broadcast('command', { text: `Running ${arena.status.command}` });
  let detected = false;
  const attach = (stream, destination) => {
    const decoder = new StringDecoder('utf8');
    let pending = '';
    const context = [];
    const examine = (line) => {
      // Only error-bearing lines trigger reactions; normal stack frames remain in terminal output.
      if (/\b0 errors?\b|\bno errors?\b/i.test(line)) return;
      if (classifyError(line) && arena.reportError([...context, line].join('\n'))) detected = true;
      context.push(line.slice(0, 500));
      if (context.length > 5) context.shift();
    };
    stream.on('data', chunk => {
      destination?.write(chunk);
      pending += decoder.write(chunk);
      const lines = pending.split(/\r?\n|\r/); pending = lines.pop();
      for (const line of lines) examine(line.slice(0, 8000));
      if (pending.length > 8000) { examine(pending.slice(0, 8000)); pending = ''; }
    });
    stream.on('end', () => { pending += decoder.end(); if (pending) examine(pending.slice(0, 8000)); });
  };
  attach(child.stdout, stdout); attach(child.stderr, stderr);
  const completion = new Promise(resolve => {
    let spawnError;
    child.once('error', error => { spawnError = error; arena.reportError(`Error: Cannot start ${command}: ${error.message}`, { force: true }); detected = true; });
    child.once('close', (code, signal) => {
      const exitCode = spawnError ? 127 : code ?? (signal === 'SIGINT' ? 130 : 1);
      arena.status = { ...arena.status, running: false, exitCode };
      if (exitCode === 0) arena.success();
      else if (!detected && !signal) arena.reportError(`Error: Command exited with code ${exitCode}. See the terminal output for details.`, { force: true });
      arena.broadcast('command-end', { exitCode, signal });
      resolve(exitCode);
    });
  });
  function stop(signal = 'SIGTERM') {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
    try { if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal); } catch (e) { if (e.code !== 'ESRCH') throw e; }
  }
  return { child, completion, stop };
}
