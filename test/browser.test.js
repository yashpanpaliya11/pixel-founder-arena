import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserDemo } from '../src/browser.js';

test('browser transport drives real package dialogue and preserves English hints', async () => {
  const demo = createBrowserDemo(); const seen = [];
  const unsubscribe = demo.subscribe(() => {}, event => seen.push(event));
  await demo.request('settings', { language: 'hinglish', intensity: 'savage' });
  await demo.request('project', { name: 'StudyPal', audience: 'students' });
  await demo.request('demo', { category: 'reference' });
  assert.equal(seen[0].error.category, 'reference'); assert.match(seen[0].roast, /Keyboard/);
  assert.match(seen[0].error.guide.meaning, /variable is being used/);
  await demo.request('debate', { topic: 'MRR' });
  assert.equal(seen[1].debate.project, 'StudyPal');
  assert.ok(seen[1].debate.lines.every(line => line.targetId !== line.founderId));
  assert.equal(demo.snapshot().stats.xp, 0); unsubscribe();
});
test('browser demo persists tasks and rewards each task once', async () => {
  const map = new Map(); const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const demo = createBrowserDemo({ storage });
  await demo.request('tasks', { action: 'add', text: 'Learn loops' }); const id = demo.snapshot().tasks[0].id;
  await demo.request('tasks', { action: 'toggle', id });
  const restored = createBrowserDemo({ storage });
  assert.equal(restored.snapshot().stats.xp, 20);
  await restored.request('tasks', { action: 'toggle', id }); await restored.request('tasks', { action: 'toggle', id });
  assert.equal(restored.snapshot().stats.xp, 20);
  await assert.rejects(() => restored.request('run', { command: 'node app.js' }), /sample events only/);
});
test('browser demo validates cast selection and unknown sample categories', async () => {
  const demo = createBrowserDemo();
  await assert.rejects(() => demo.request('settings', { selected: ['elon'] }), /two to five/);
  await assert.rejects(() => demo.request('demo', { category: '__proto__' }), /Unknown sample/);
  await demo.request('settings', { paused: true });
  await assert.rejects(() => demo.request('debate', { topic: 'AI' }), /Resume/);
});
