import { founders } from './founders.js';
import { classifyError } from './errors.js';
import { chooseRoast, createDebate } from './dialogue.js';

export { founders } from './founders.js';
export { classifyError, errorGuides } from './errors.js';
export { chooseRoast, createDebate, topics } from './dialogue.js';

const examples = {
  syntax: 'SyntaxError: Unexpected token ")"\n    at example.js:12:8',
  reference: 'ReferenceError: total is not defined\n    at example.js:8:3',
  type: "TypeError: Cannot read properties of undefined (reading 'name')\n    at example.js:5:15",
  module: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'missing-package' imported from example.js:1:1",
  test: 'AssertionError: expected 42, received undefined\n    at example.test.js:7:1',
};

/** A browser-only sample transport. Never executes code or observes local terminals. */
export function createBrowserDemo({ storage, storageKey = 'founder-arena-demo-v1' } = {}) {
  const subscribers = new Set();
  let settings = { language: 'en', intensity: 'funny', sound: false, paused: false, cooldown: 12, dialogueInterval: 35, animationSpeed: 1, selected: ['elon', 'jensen', 'zuck', 'jobs', 'levels'] };
  let project = { name: '', audience: '', description: '' };
  let tasks = [];
  let stats = { xp: 0, errors: 0, successes: 0, completedTasks: 0, categories: {} };
  const events = [];
  let warning = null;
  const snapshot = () => structuredClone({ founders, settings, project, tasks, stats, events, status: { running: false, command: null, exitCode: null }, warning });
  const save = () => {
    if (!storage) return;
    try { storage.setItem(storageKey, JSON.stringify({ settings, project, tasks, stats })); }
    catch { warning = 'Browser storage is unavailable. Changes will last for this tab only.'; }
  };
  const publish = () => { save(); for (const s of subscribers) s.onState(snapshot()); };
  const emit = (type, data) => {
    const event = { id: crypto.randomUUID(), time: Date.now(), type, ...data };
    events.push(event); if (events.length > 60) events.shift();
    for (const s of subscribers) s.onEvent?.(structuredClone(event));
    return event;
  };
  const updateSettings = body => {
    const next = { ...settings };
    for (const [key, value] of Object.entries(body)) {
      if (key === 'language' && !['en', 'hinglish'].includes(value)) throw new Error('Invalid roast language.');
      else if (key === 'intensity' && !['chill', 'funny', 'savage'].includes(value)) throw new Error('Invalid roast intensity.');
      else if (['sound', 'paused'].includes(key) && typeof value !== 'boolean') throw new Error('Invalid toggle value.');
      else if (['cooldown', 'dialogueInterval', 'animationSpeed'].includes(key)) {
        const [min, max] = key === 'animationSpeed' ? [.5, 2] : key === 'cooldown' ? [0, 300] : [15, 300];
        if (!Number.isFinite(value) || value < min || value > max) throw new Error('Invalid timing setting.');
      } else if (key === 'selected' && (!Array.isArray(value) || value.length < 2 || value.length > 5 || new Set(value).size !== value.length || value.some(id => !founders.some(f => f.id === id)))) throw new Error('Select two to five available characters.');
      if (!(key in settings)) throw new Error(`Unknown setting: ${key}`);
      next[key] = value;
    }
    settings = next;
  };
  const updateProject = body => {
    const next = { ...project };
    for (const [key, max] of [['name', 80], ['audience', 160], ['description', 500]]) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'string' || body[key].length > max) throw new Error(`Invalid project ${key}.`);
        next[key] = body[key].trim();
      }
    }
    project = next;
  };
  if (storage) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey) || 'null');
      if (saved) {
        updateSettings(saved.settings ?? {}); updateProject(saved.project ?? {});
        if (Array.isArray(saved.tasks)) tasks = saved.tasks.filter(t => t && typeof t.id === 'string' && typeof t.text === 'string' && t.text.length <= 180 && typeof t.done === 'boolean').slice(0, 50);
        if (saved.stats && ['xp', 'errors', 'successes', 'completedTasks'].every(k => Number.isSafeInteger(saved.stats[k]) && saved.stats[k] >= 0)) stats = { ...stats, ...saved.stats };
      }
    } catch { warning = 'Saved demo data could not be read. Using defaults.'; }
  }
  return {
    snapshot,
    subscribe(onState, onEvent) {
      const subscriber = { onState, onEvent }; subscribers.add(subscriber); onState(snapshot());
      return () => subscribers.delete(subscriber);
    },
    async request(path, body = {}) {
      const cast = () => settings.selected.map(id => founders.find(f => f.id === id));
      switch (path) {
        case 'state': return snapshot();
        case 'settings': updateSettings(body); break;
        case 'project': updateProject(body); break;
        case 'demo': {
          if (body.category === 'success') emit('success', { demo: true, suppressed: settings.paused, text: 'Sample command succeeded. Now try it with your own code using the CLI.' });
          else {
            if (!Object.hasOwn(examples, body.category)) throw new Error('Unknown sample error.');
            const error = classifyError(examples[body.category]);
            const founder = cast()[Math.floor(Math.random() * cast().length)];
            emit('error', { error, founderId: founder.id, demo: true, suppressed: settings.paused, roast: chooseRoast({ founder, category: error.category, ...settings }) });
          }
          break;
        }
        case 'debate':
          if (settings.paused) throw new Error('Resume the arena before starting a debate.');
          emit('debate', { debate: createDebate({ topic: body.topic, project, cast: cast(), language: settings.language, intensity: settings.intensity }) }); break;
        case 'tasks': {
          if (body.action === 'add') {
            if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 180) throw new Error('Task must contain 1–180 characters.');
            if (tasks.length >= 50) throw new Error('Keep at most 50 tasks.');
            tasks.push({ id: crypto.randomUUID(), text: body.text.trim(), done: false, rewarded: false });
          } else {
            const task = tasks.find(t => t.id === body.id);
            if (!task) throw new Error('Task not found.');
            if (body.action === 'delete') tasks = tasks.filter(t => t.id !== task.id);
            else if (body.action === 'toggle') {
              task.done = !task.done;
              if (task.done && !task.rewarded) { task.rewarded = true; stats.xp += 20; stats.completedTasks++; emit('milestone', { text: `Completed: ${task.text}` }); }
            } else throw new Error('Unknown task action.');
          }
          break;
        }
        default: throw new Error('This browser demo supports sample events only. Use the CLI for actual command monitoring.');
      }
      publish(); return snapshot();
    },
  };
}
