import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createArena, founders, classifyError, createDebate, chooseRoast, runCommand, startServer } from '../src/index.js';

const makeArena = () => createArena({ persist: false });
const sink = { write() {} };

test('all 35 bundled characters have unique IDs and valid sprite cells', () => {
  assert.equal(founders.length, 35); assert.equal(new Set(founders.map(f => f.id)).size, 35);
  for (const f of founders) { assert.ok(f.column >= 0 && f.column < 5); assert.ok(f.row >= 0 && f.row < f.rows); }
});
test('Indian founders have matching sprite cells, badges, and character dialogue', () => {
  const india = founders.filter(f => f.sheet === 'india');
  assert.equal(india.length, 10);
  assert.equal(india.find(f => f.id === 'anupam').company, 'Shaadi.com');
  assert.equal(india.find(f => f.id === 'peyush').company, 'Lenskart');
  assert.equal(india.find(f => f.id === 'aadit').company, 'Zepto');
  assert.equal(india.find(f => f.id === 'kaivalya').company, 'Zepto');
  for (const f of india) {
    const line = chooseRoast({ founder: f, category: 'syntax', language: 'hinglish', random: () => 0 });
    assert.ok(line.length > 40);
    const debate = createDebate({ topic: 'Marketing', cast: [f, founders[0]], random: () => 0 });
    assert.ok(debate.lines.every(l => l.founderId !== l.targetId && l.roast.length > 20));
  }
});
test('classifies real JavaScript diagnostics and preserves file locations', () => {
  for (const [text, category] of [['SyntaxError: Unexpected token )', 'syntax'], ['ReferenceError: total is not defined', 'reference'], ["TypeError: Cannot read properties of undefined", 'type'], ["Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'foo'", 'module'], ['RangeError: Maximum call stack size exceeded', 'range'], ['AssertionError: expected 1 got 2', 'test']]) {
    const error = classifyError(`\u001b[31m${text}\u001b[0m\n at /projects/app.js:12:4`);
    assert.equal(error.category, category); assert.equal(error.location.line, 12); assert.equal(error.location.column, 4); assert.ok(!error.message.includes('\u001b'));
  }
  assert.equal(classifyError('Server listening on port 3000'), null);
});
test('English/Hinglish selection changes only roast text', () => {
  const arena = makeArena(); arena.updateSettings({ language: 'hinglish', cooldown: 0 });
  const event = arena.reportError('ReferenceError: total is not defined');
  assert.equal(event.error.guide.meaning, 'A variable is being used where it has not been defined or is not accessible.');
  assert.ok(event.roast.length > 5);
  assert.match(chooseRoast({ category: 'syntax', language: 'hinglish', random: () => 0 }), /bhai/);
});
test('cooldown suppresses animations while retaining different errors', () => {
  const arena = makeArena();
  const first = arena.reportError('SyntaxError: Unexpected token )');
  const duplicate = arena.reportError('SyntaxError: Unexpected token )');
  const next = arena.reportError('ReferenceError: total is not defined');
  assert.equal(first.suppressed, false); assert.equal(duplicate, null); assert.equal(next.suppressed, true); assert.equal(arena.stats.errors, 2);
});
test('roast selection avoids an immediate repeat including character signatures', () => {
  const options = { founder: founders[0], category: 'syntax', intensity: 'savage', random: () => 0 };
  const first = chooseRoast(options);
  assert.notEqual(chooseRoast({ ...options, previous: first }), first);
});
test('pause suppresses reactions and blocks debates; samples never award progress', () => {
  const arena = makeArena(); arena.updateSettings({ paused: true });
  assert.equal(arena.reportError('SyntaxError: missing }', { demo: true, force: true }).suppressed, true);
  arena.success({ demo: true }); assert.equal(arena.stats.xp, 0); assert.equal(arena.stats.errors, 0);
  assert.throws(() => arena.debate('MRR'), /Resume/);
});
test('invalid settings are rejected atomically', () => {
  const arena = makeArena(); const before = structuredClone(arena.settings);
  for (const patch of [{ language: 'fr' }, { selected: ['elon'] }, { selected: ['elon', 'nope'] }, { cooldown: -1 }, { sound: 'yes' }, { animationSpeed: Infinity }, { surprise: true }]) assert.throws(() => arena.updateSettings(patch));
  assert.deepEqual(arena.settings, before);
});
test('task completion rewards once, not on checkbox toggles', () => {
  const arena = makeArena(); arena.task('add', { text: 'Ship a demo' }); const id = arena.tasks[0].id;
  for (let i = 0; i < 5; i++) arena.task('toggle', { id });
  assert.equal(arena.stats.xp, 20); assert.equal(arena.stats.completedTasks, 1);
  arena.task('delete', { id }); assert.equal(arena.tasks.length, 0);
});
test('state round-trips preferences, tasks, and stats without storing raw diagnostics', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'founder-state-'));
  try {
    const path = join(dir, 'state.json'); const arena = createArena({ stateFile: path });
    arena.updateSettings({ language: 'hinglish' }); arena.updateProject({ name: 'StudyPal', audience: 'students' });
    arena.task('add', { text: 'Finish loops' }); arena.task('toggle', { id: arena.tasks[0].id }); arena.reportError('ReferenceError: secretName is not defined');
    const restored = createArena({ stateFile: path });
    assert.equal(restored.settings.language, 'hinglish'); assert.equal(restored.project.name, 'StudyPal'); assert.equal(restored.stats.xp, 20); assert.equal(restored.tasks[0].done, true);
    assert.ok(!(await readFile(path, 'utf8')).includes('secretName'));
    restored.task('toggle', { id: restored.tasks[0].id }); restored.task('toggle', { id: restored.tasks[0].id }); assert.equal(restored.stats.xp, 20);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('corrupt saved state falls back without crashing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'founder-corrupt-'));
  try { const stateFile = join(dir, 'state.json'); await writeFile(stateFile, 'nope'); const arena = createArena({ stateFile }); assert.match(arena.warning, /defaults/); assert.equal(arena.activeFounders().length, 5); }
  finally { await rm(dir, { recursive: true, force: true }); }
});
test('custom packs validate data and use supplied roast lines', () => {
  const custom = { id: 'duck', name: 'Duck', company: 'Desk', specialty: 'Debugging', roasts: { en: ['Quack. Scope?'], hinglish: ['Scope dekh bhai.'] } };
  const arena = createArena({ persist: false, customFounders: [custom] });
  const duck = arena.founders.find(f => f.id === 'duck');
  assert.equal(chooseRoast({ founder: duck }), 'Quack. Scope?');
  assert.throws(() => createArena({ persist: false, customFounders: [{ ...custom, id: 'elon' }] }), /unique/);
  assert.throws(() => createArena({ persist: false, customFounders: [{ ...custom, roasts: { en: [3] } }] }), /Roasts/);
});
test('debates reference the project and end with an actionable challenge', () => {
  const debate = createDebate({ topic: 'MRR', project: { name: 'StudyPal', audience: 'students' }, cast: founders.slice(0, 3) });
  assert.match(debate.lines[0].text, /StudyPal.*students/); assert.match(debate.takeaway, /paid pilot/); assert.match(debate.note, /fictional/);
  assert.throws(() => createDebate({ topic: 'bad', cast: founders }), /supported/);
});
test('every debate topic includes targeted roasts without self-roasting', () => {
  for (const topic of ['MRR', 'Marketing', 'Bootstrapping', 'Competitors', 'Product', 'AI']) {
    for (const cast of [founders.slice(0, 2), founders.slice(0, 5)]) {
      const result = createDebate({ topic, cast, random: () => 0 });
      for (const line of result.lines) {
        assert.notEqual(line.founderId, line.targetId);
        assert.ok(cast.some(f => f.id === line.targetId));
        assert.ok(line.roast.length > 20);
        assert.match(line.roast, new RegExp(cast.find(f => f.id === line.targetId).name.split(' ')[0]));
      }
    }
  }
});
test('debate roast language and intensity follow settings; advice stays English', () => {
  const options = { topic: 'MRR', cast: founders.slice(0, 3), random: () => 0 };
  const english = createDebate({ ...options, language: 'en' });
  const hinglish = createDebate({ ...options, language: 'hinglish' });
  assert.notEqual(english.lines[0].roast, hinglish.lines[0].roast);
  assert.deepEqual(english.lines.map(l => l.text), hinglish.lines.map(l => l.text));
  assert.equal(english.takeaway, hinglish.takeaway);
  assert.match(createDebate({ ...options, intensity: 'savage' }).lines[0].roast, /refund/);
  assert.match(createDebate({ ...options, intensity: 'chill' }).lines[0].roast, /small experiment/);
  const arena = makeArena(); arena.updateSettings({ language: 'hinglish', intensity: 'savage' });
  assert.ok(arena.debate('AI').debate.lines.every(l => l.roast.includes('refund maang liya')));
});
test('debate speakers rotate through the selected cast', () => {
  const cast = founders.slice(0, 5);
  assert.equal(createDebate({ cast, random: () => .99 }).lines[0].founderId, cast[4].id);
});
test('runner observes a real ReferenceError and preserves failure exit code', async () => {
  const arena = makeArena();
  const runner = runCommand(arena, process.execPath, ['examples/broken.js'], { stdout: sink, stderr: sink });
  assert.equal(await runner.completion, 1);
  const event = arena.events.find(e => e.type === 'error');
  assert.equal(event.error.category, 'reference'); assert.equal(event.error.location.line, 2); assert.equal(arena.stats.successes, 0); assert.equal(arena.status.running, false);
});
test('runner decodes error messages split across chunks', async () => {
  const arena = makeArena();
  const runner = runCommand(arena, process.execPath, ['-e', "process.stderr.write('Reference'); setTimeout(() => { process.stderr.write('Error: total is not defined\\n'); process.exitCode=2; }, 30)"], { stdout: sink, stderr: sink });
  assert.equal(await runner.completion, 2); assert.equal(arena.events.find(e => e.type === 'error').error.category, 'reference');
});
test('runner reports success and awards progress for a clean command', async () => {
  const arena = makeArena(); const runner = runCommand(arena, process.execPath, ['examples/fixed.js'], { stdout: sink, stderr: sink });
  assert.equal(await runner.completion, 0); assert.equal(arena.stats.xp, 10); assert.equal(arena.stats.successes, 1);
});
test('runner handles a missing executable and generic nonzero exit', async () => {
  const arena = makeArena();
  assert.equal(await runCommand(arena, 'founder-arena-executable-does-not-exist', [], { stdout: sink, stderr: sink }).completion, 127);
  const second = makeArena();
  assert.equal(await runCommand(second, process.execPath, ['-e', 'process.exit(7)'], { stdout: sink, stderr: sink }).completion, 7);
  assert.equal(second.events.find(e => e.type === 'error').error.category, 'generic');
});
test('runner passes shell metacharacters literally', async () => {
  const arena = makeArena(); let output = '';
  const runner = runCommand(arena, process.execPath, ['-e', 'console.log(process.argv[1])', 'a; echo INJECTED'], { stdout: { write(chunk) { output += chunk; } }, stderr: sink });
  assert.equal(await runner.completion, 0); assert.equal(output.trim(), 'a; echo INJECTED');
});
test('server requires a token, rejects foreign origins, serves assets, and handles real API state', async () => {
  const arena = makeArena(); const service = await startServer(arena);
  const headers = { 'X-Arena-Token': service.token, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${service.url}/api/state`)).status, 403);
    assert.equal((await fetch(`${service.url}/api/state`, { headers: { ...headers, Origin: 'https://example.com' } })).status, 403);
    const page = await fetch(service.url); assert.equal(page.status, 200); assert.match(await page.text(), new RegExp(service.token));
    const image = await fetch(`${service.url}/assets/founders.png`); assert.equal(image.headers.get('content-type'), 'image/png'); assert.ok((await image.arrayBuffer()).byteLength > 10000);
    const indianArt = await fetch(`${service.url}/assets/india.png`); assert.equal(indianArt.status, 200); assert.equal(indianArt.headers.get('content-type'), 'image/png'); assert.ok((await indianArt.arrayBuffer()).byteLength > 10000);
    const changed = await fetch(`${service.url}/api/settings`, { method: 'POST', headers, body: JSON.stringify({ language: 'hinglish' }) }); assert.equal(changed.status, 200);
    await fetch(`${service.url}/api/demo`, { method: 'POST', headers, body: JSON.stringify({ category: 'syntax' }) });
    const state = await (await fetch(`${service.url}/api/state`, { headers })).json();
    assert.equal(state.settings.language, 'hinglish'); assert.equal(state.events.at(-1).error.category, 'syntax'); assert.equal(state.stats.errors, 0);
    assert.equal((await fetch(`${service.url}/api/settings`, { method: 'POST', headers, body: '{bad' })).status, 400);
    assert.equal((await fetch(`${service.url}/api/settings`, { method: 'POST', headers, body: JSON.stringify({ selected: [] }) })).status, 400);
    assert.equal((await fetch(`${service.url}/../src/index.js`)).status, 404);
  } finally { await service.close(); }
});
test('SSE delivers actual engine errors to a connected browser client', async () => {
  const arena = makeArena(); const service = await startServer(arena);
  const controller = new AbortController();
  try {
    const response = await fetch(`${service.url}/api/events?token=${service.token}`, { signal: controller.signal });
    const reader = response.body.getReader();
    const first = await reader.read(); assert.match(new TextDecoder().decode(first.value), /event: state/);
    arena.reportError('SyntaxError: Unexpected token }');
    const next = await reader.read(); const message = new TextDecoder().decode(next.value);
    assert.match(message, /event: arena/); assert.match(message, /SyntaxError/); await reader.cancel();
  } finally { controller.abort(); await service.close(); }
});
test('CLI --exit returns the child exit code and does not consume child --help', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'founder-cli-'));
  try {
    const run = args => new Promise(resolve => {
      const child = spawn(process.execPath, ['bin/founder-arena.js', 'run', '--no-open', '--exit', '--state', join(dir, 'state.json'), '--', process.execPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
      let output = ''; child.stdout.on('data', c => { output += c; }); child.stderr.on('data', c => { output += c; }); child.once('close', code => resolve({ code, output }));
    });
    assert.equal((await run(['-e', 'process.exit(3)'])).code, 3);
    const help = await run(['--help']); assert.equal(help.code, 0); assert.match(help.output, /Usage: node/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
