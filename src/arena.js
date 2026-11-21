import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { founders, validateCustomFounders } from './founders.js';
import { classifyError } from './errors.js';
import { chooseRoast, createDebate } from './dialogue.js';

const defaults = {
  language: 'en', intensity: 'funny', sound: false, paused: false,
  cooldown: 12, dialogueInterval: 35, animationSpeed: 1,
  selected: ['elon', 'jensen', 'zuck', 'jobs', 'levels'],
};

export class Arena extends EventEmitter {
  constructor({ stateFile = resolve('.founder-arena/state.json'), customFounders = [], persist = true } = {}) {
    super();
    this.stateFile = stateFile;
    this.persist = persist;
    this.founders = [...founders, ...validateCustomFounders(customFounders)];
    this.events = [];
    this.lastReaction = 0;
    this.lastRoast = '';
    this.fingerprints = new Map();
    this.status = { running: false, command: null, exitCode: null };
    this.settings = { ...defaults, selected: [...defaults.selected] };
    this.project = { name: '', audience: '', description: '' };
    this.tasks = [];
    this.stats = { xp: 0, errors: 0, successes: 0, completedTasks: 0, categories: {} };
    this.warning = null;
    if (persist) {
      try {
        const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
        this.updateSettings(saved.settings ?? {}, false);
        this.updateProject(saved.project ?? {}, false);
        if (Array.isArray(saved.tasks)) this.tasks = saved.tasks.slice(0, 50).filter(t => t && typeof t.id === 'string' && typeof t.text === 'string' && t.text.length <= 180 && typeof t.done === 'boolean');
        if (saved.stats && ['xp', 'errors', 'successes', 'completedTasks'].every(k => Number.isSafeInteger(saved.stats[k]) && saved.stats[k] >= 0) && saved.stats.categories && typeof saved.stats.categories === 'object') {
          this.stats = { ...this.stats, ...saved.stats, categories: Object.fromEntries(Object.entries(saved.stats.categories).filter(([k, v]) => ['syntax', 'reference', 'type', 'module', 'test', 'range', 'generic'].includes(k) && Number.isSafeInteger(v) && v >= 0)) };
        }
      } catch (e) { if (e.code !== 'ENOENT') this.warning = 'Saved state could not be read. Using defaults.'; }
    }
  }
  save() {
    if (!this.persist) return;
    try {
      mkdirSync(dirname(this.stateFile), { recursive: true });
      const temporary = `${this.stateFile}.${process.pid}.tmp`;
      writeFileSync(temporary, JSON.stringify({ version: 1, settings: this.settings, project: this.project, tasks: this.tasks, stats: this.stats }, null, 2), { mode: 0o600 });
      renameSync(temporary, this.stateFile);
    } catch { this.warning = 'Progress could not be saved. This session still works in memory.'; }
  }
  snapshot() {
    return { founders: this.founders.map(({ roasts, ...f }) => f), settings: this.settings, project: this.project, tasks: this.tasks, stats: this.stats, status: this.status, events: this.events, warning: this.warning };
  }
  broadcast(type, data = {}) {
    const event = { id: randomUUID(), type, time: Date.now(), ...data };
    this.events.push(event);
    if (this.events.length > 60) this.events.shift();
    this.emit('event', event);
    return event;
  }
  updateSettings(patch, save = true) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Settings must be an object.');
    const next = { ...this.settings };
    for (const [key, value] of Object.entries(patch)) {
      if (['language', 'intensity'].includes(key)) {
        if (!(key === 'language' ? ['en', 'hinglish'] : ['chill', 'funny', 'savage']).includes(value)) throw new Error(`Invalid ${key}.`);
      } else if (['sound', 'paused'].includes(key)) {
        if (typeof value !== 'boolean') throw new Error(`${key} must be true or false.`);
      } else if (['cooldown', 'dialogueInterval', 'animationSpeed'].includes(key)) {
        const [min, max] = key === 'animationSpeed' ? [0.5, 2] : key === 'cooldown' ? [0, 300] : [15, 300];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${key}.`);
      } else if (key === 'selected') {
        if (!Array.isArray(value) || value.length < 2 || value.length > 5 || new Set(value).size !== value.length || value.some(id => !this.founders.some(f => f.id === id))) throw new Error('Select two to five different available characters.');
      } else throw new Error(`Unknown setting: ${key}.`);
      next[key] = value;
    }
    this.settings = next;
    if (save) { this.save(); this.emit('state'); }
  }
  updateProject(project, save = true) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Project must be an object.');
    const result = { ...this.project };
    for (const [key, limit] of [['name', 80], ['audience', 160], ['description', 500]]) {
      if (project[key] !== undefined) {
        if (typeof project[key] !== 'string' || project[key].length > limit) throw new Error(`Invalid project ${key}.`);
        result[key] = project[key].trim();
      }
    }
    this.project = result;
    if (save) { this.save(); this.emit('state'); }
  }
  activeFounders() { return this.settings.selected.map(id => this.founders.find(f => f.id === id)); }
  reportError(output, { demo = false, force = false } = {}) {
    const error = classifyError(output);
    if (!error) return null;
    const now = Date.now();
    const fingerprint = `${error.category}:${error.message}`;
    const last = this.fingerprints.get(fingerprint) ?? 0;
    if (!demo && now - last < Math.max(1000, this.settings.cooldown * 1000)) return null;
    if (!demo) {
      this.fingerprints.set(fingerprint, now);
      if (this.fingerprints.size > 200) this.fingerprints.delete(this.fingerprints.keys().next().value);
      this.stats.errors++;
      this.stats.categories[error.category] = (this.stats.categories[error.category] ?? 0) + 1;
      this.save();
    }
    const cast = this.activeFounders();
    const founder = cast[Math.floor(Math.random() * cast.length)];
    const suppressed = this.settings.paused || (!force && now - this.lastReaction < this.settings.cooldown * 1000);
    const roast = chooseRoast({ founder, category: error.category, ...this.settings, previous: this.lastRoast });
    if (!suppressed) { this.lastReaction = now; this.lastRoast = roast; }
    return this.broadcast('error', { error, founderId: founder.id, roast, suppressed, demo });
  }
  success({ demo = false } = {}) {
    if (!demo) { this.stats.successes++; this.stats.xp += 10; this.save(); }
    return this.broadcast('success', { demo, suppressed: this.settings.paused, text: 'Command succeeded. A little less debugging, a little more shipping.' });
  }
  debate(topic = 'MRR') {
    if (this.settings.paused) throw new Error('Resume the arena before starting a debate.');
    return this.broadcast('debate', { debate: createDebate({ topic, project: this.project, cast: this.activeFounders(), language: this.settings.language, intensity: this.settings.intensity }) });
  }
  task(action, payload = {}) {
    if (action === 'add') {
      if (typeof payload.text !== 'string' || !payload.text.trim() || payload.text.length > 180) throw new Error('Task must contain 1–180 characters.');
      if (this.tasks.length >= 50) throw new Error('Keep at most 50 tasks.');
      this.tasks.push({ id: randomUUID(), text: payload.text.trim(), done: false, rewarded: false });
    } else {
      const task = this.tasks.find(t => t.id === payload.id);
      if (!task) throw new Error('Task not found.');
      if (action === 'toggle') {
        task.done = !task.done;
        if (task.done && !task.rewarded) { task.rewarded = true; this.stats.xp += 20; this.stats.completedTasks++; this.broadcast('milestone', { text: `Completed: ${task.text}` }); }
      } else if (action === 'delete') this.tasks = this.tasks.filter(t => t.id !== task.id);
      else throw new Error('Unknown task action.');
    }
    this.save(); this.emit('state');
    return this.tasks;
  }
}

export function createArena(options) { return new Arena(options); }
