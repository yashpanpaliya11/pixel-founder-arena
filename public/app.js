export function mountArena({ transport } = {}) {
const token = document.querySelector('meta[name="arena-token"]')?.content;
const $ = id => document.getElementById(id);
const node = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; };
let state;
let initialized = false;
let castSignature = '';
let tasksSignature = '';
let knownEvents = new Set();
let reactionUntil = 0;
let dialogueTimer;
let speechTimer;
let noticeTimer;
let animationTimers = [];
let audioContext;
let connected = false;

function notice(text) {
  $('notice').textContent = text; $('notice').hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 6000);
}
async function api(path, body) {
  if (transport) return transport.request(path, body);
  const response = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Arena-Token': token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function action(fn) { return async event => { event?.preventDefault(); try { await fn(event); } catch (e) { notice(e.message); } }; }
function founder(id) { return state.founders.find(f => f.id === id); }
function picture(f, portrait = false) {
  const frame = node('div', portrait ? 'portrait' : 'sprite');
  frame.setAttribute('aria-hidden', 'true');
  if (f.custom) { frame.classList.add('fallback'); frame.textContent = f.name.slice(0, 1); return frame; }
  const art = node('div', 'sprite-art');
  const img = document.createElement('img');
  img.src = `/assets/${f.sheet}.png`; img.alt = ''; img.draggable = false;
  const cell = portrait ? 70 : 150;
  img.style.width = `${cell * 5}px`;
  img.style.left = `${-f.column * cell - (portrait ? 14 : 0)}px`;
  img.style.top = `${-f.row * cell * 5 / 3 - (portrait ? 1 : 0)}px`;
  art.append(img); frame.append(art); return frame;
}
function renderCast() {
  $('cast').replaceChildren();
  state.settings.selected.forEach((id, index) => {
    const f = founder(id);
    const actor = node('div', 'actor'); actor.dataset.founder = id;
    actor.style.setProperty('--delay', `${index * -0.6}s`);
    actor.append(picture(f), node('span', 'actor-name', f.name), node('span', 'actor-company', f.company));
    $('cast').append(actor);
  });
  $('cast-count').textContent = `${state.settings.selected.length} / ${state.founders.length} CHARACTERS`;
  $('roster').replaceChildren();
  state.founders.forEach(f => {
    const selected = state.settings.selected.includes(f.id);
    const button = node('button', `founder-card${selected ? ' selected' : ''}`);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${f.name}, ${f.company}${selected ? ', selected' : ''}`);
    const info = node('div');
    info.append(node('strong', '', f.name), node('small', '', f.company), node('span', 'specialty', f.specialty));
    button.append(picture(f, true), info, node('span', 'check', selected ? '■' : '+'));
    button.addEventListener('click', action(async () => {
      const current = state.settings.selected;
      const next = current.includes(f.id) ? current.filter(id => id !== f.id) : [...current, f.id];
      if (next.length < 2 || next.length > 5) return notice('Choose two to five characters. Remove one before adding another.');
      render(await api('settings', { selected: next }));
    }));
    $('roster').append(button);
  });
}
function renderTasks() {
  $('tasks').replaceChildren();
  if (!state.tasks.length) { $('tasks').append(node('p', 'fine-print', 'A small finished task beats a giant unfinished idea.')); return; }
  state.tasks.forEach(task => {
    const row = node('div', `task-row${task.done ? ' done' : ''}`);
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.setAttribute('aria-label', `Complete ${task.text}`);
    check.addEventListener('change', action(async () => render(await api('tasks', { action: 'toggle', id: task.id }))));
    const remove = node('button', 'icon-button', '×'); remove.setAttribute('aria-label', `Delete ${task.text}`);
    remove.addEventListener('click', action(async () => render(await api('tasks', { action: 'delete', id: task.id }))));
    row.append(check, node('span', '', task.text), remove); $('tasks').append(row);
  });
}
function eventCard(event) {
  const card = node('article', 'feed-event'); card.dataset.id = event.id;
  const header = node('div', 'event-header');
  const who = node('span', 'event-person', event.founderId ? founder(event.founderId)?.name ?? 'Founder' : event.type === 'debate' ? 'Boardroom debate' : 'Arena update');
  const meta = node('span');
  if (event.demo) meta.append(node('span', 'event-type sample-badge', 'SAMPLE'));
  meta.append(node('span', 'event-type', event.type === 'error' ? event.error.category.toUpperCase() : event.type.toUpperCase()));
  header.append(who, meta); card.append(header);
  if (event.type === 'error') {
    card.append(node('p', 'roast', event.roast));
    if (event.suppressed) card.append(node('p', 'fine-print', 'Reaction quieted by pause or cooldown.'));
    card.append(node('pre', 'error-output', event.error.message));
    if (event.error.location) {
      const l = event.error.location; card.append(node('p', 'fine-print', `${l.file}:${l.line}${l.column ? `:${l.column}` : ''}`));
    }
    const details = node('details');
    details.append(node('summary', '', 'Explain this error + progressive hints'));
    details.append(node('p', '', event.error.guide.meaning));
    const hints = node('div'); const hintButton = node('button', 'hint-button', 'Show first hint');
    let index = 0;
    hintButton.addEventListener('click', () => {
      if (index < event.error.guide.hints.length) {
        hints.append(node('div', 'hint', `${index + 1}. ${event.error.guide.hints[index]}`)); index++;
        hintButton.textContent = index === event.error.guide.hints.length ? 'Show learning example' : 'Show next hint';
      } else {
        hints.append(node('pre', 'error-output', event.error.guide.example));
        hints.append(node('p', 'fine-print', 'Illustrative example, not a guaranteed patch for your file.'));
        hintButton.remove();
      }
    });
    details.append(hints, hintButton); card.append(details);
  } else if (event.type === 'debate') {
    card.append(node('p', 'roast', `${event.debate.topic} · ${event.debate.project}`));
    event.debate.lines.forEach(line => {
      const item = node('div', 'debate-line');
      const speaker = founder(line.founderId)?.name ?? 'Founder';
      const target = line.targetId ? founder(line.targetId)?.name : null;
      item.append(node('b', '', target ? `${speaker} → ${target}` : speaker));
      if (line.roast) item.append(node('p', 'debate-roast', line.roast));
      item.append(node('span', '', line.text)); card.append(item);
    });
    card.append(node('div', 'takeaway', `Your next move: ${event.debate.takeaway}`), node('p', 'fine-print', event.debate.note));
  } else card.append(node('p', 'roast', event.text ?? (event.type === 'command-end' ? `Command finished with exit code ${event.exitCode}.` : 'Keep building.')));
  const time = node('p', 'fine-print', new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); card.append(time);
  return card;
}
function render(data) {
  state = data;
  $('xp').replaceChildren(document.createTextNode(`${state.stats.xp} `), node('small', '', 'XP'));
  const level = Math.floor(state.stats.xp / 100) + 1;
  $('level').textContent = `Level ${level} · ${level < 2 ? 'Getting started' : level < 5 ? 'Finding your rhythm' : 'Shipping momentum'}`;
  $('xp-fill').style.width = `${state.stats.xp % 100}%`;
  $('command-status').textContent = state.status.running ? 'COMMAND RUNNING' : state.status.exitCode === null ? 'ARENA READY' : state.status.exitCode === 0 ? 'LAST RUN: SUCCESS' : `LAST RUN: EXIT ${state.status.exitCode}`;
  $('pause').textContent = state.settings.paused ? 'Resume arena' : 'Pause arena';
  $('paused-overlay').hidden = !state.settings.paused;
  document.body.classList.toggle('paused', state.settings.paused);
  document.documentElement.style.setProperty('--speed', state.settings.animationSpeed);
  const signature = `${state.settings.selected.join(',')}:${state.founders.length}`;
  if (signature !== castSignature) { castSignature = signature; renderCast(); }
  const taskData = JSON.stringify(state.tasks);
  if (taskData !== tasksSignature) { tasksSignature = taskData; renderTasks(); }
  const visibleEvents = state.events.filter(e => e.type !== 'command-end');
  if (visibleEvents.length) $('feed').querySelector('.empty')?.remove();
  for (const event of visibleEvents) {
    if (knownEvents.has(event.id)) continue;
    knownEvents.add(event.id); $('feed').prepend(eventCard(event));
  }
  const currentIds = new Set(visibleEvents.map(e => e.id));
  for (const card of $('feed').querySelectorAll('[data-id]')) if (!currentIds.has(card.dataset.id)) { knownEvents.delete(card.dataset.id); card.remove(); }
  $('event-count').textContent = `${visibleEvents.length} EVENTS`;
  if (!initialized) {
    initialized = true;
    $('project-name').value = state.project.name;
    $('project-audience').value = state.project.audience;
    $('project-description').value = state.project.description;
    if (state.warning) notice(state.warning);
    scheduleDebate();
    const latest = [...state.events].reverse().find(e => ['error', 'success', 'debate'].includes(e.type));
    if (latest) react(latest, true);
  }
}
function sound(success = false) {
  if (!state.settings.sound || !audioContext || document.hidden) return;
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
  oscillator.type = 'square'; oscillator.frequency.setValueAtTime(success ? 650 : 220, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(success ? 950 : 160, audioContext.currentTime + .1);
  gain.gain.setValueAtTime(.025, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .14);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .15);
}
function clearAnimation() { animationTimers.forEach(clearTimeout); animationTimers = []; document.querySelectorAll('.actor').forEach(a => a.classList.remove('speaking', 'attacking', 'victory')); }
function speech(id, text, className = 'speaking') {
  const f = founder(id); if (!f) return;
  const bubble = $('stage-speech'); bubble.replaceChildren(node('b', '', `${f.name} · fictional dialogue`), node('span', '', text)); bubble.classList.add('visible');
  document.querySelectorAll('.actor').forEach(a => a.classList.remove('speaking', 'attacking', 'victory'));
  [...$('cast').children].find(a => a.dataset.founder === id)?.classList.add(className);
  clearTimeout(speechTimer); speechTimer = setTimeout(() => { bubble.classList.remove('visible'); clearAnimation(); }, 8500);
}
function react(event, silent = false) {
  if (!state || event.suppressed || state.settings.paused) return;
  if (event.type === 'error') {
    clearAnimation(); reactionUntil = Date.now() + 10000; speech(event.founderId, event.roast, 'attacking');
    if (!silent) sound();
  } else if (event.type === 'success' || event.type === 'milestone') {
    clearAnimation(); reactionUntil = Date.now() + 8500;
    speech(state.settings.selected[0], event.text, 'victory'); if (!silent) sound(true);
  } else if (event.type === 'debate') {
    clearAnimation();
    $('stage-topic').textContent = `ON THE TABLE: ${event.debate.topic.toUpperCase()}`;
    event.debate.lines.forEach((line, i) => { animationTimers.push(setTimeout(() => { if (state.settings.paused || Date.now() < reactionUntil) return; speech(line.founderId, line.roast || line.text, 'attacking'); }, i * 7000)); });
  }
}
function scheduleDebate() {
  clearTimeout(dialogueTimer);
  dialogueTimer = setTimeout(async () => {
    if (connected && !document.hidden && !state.settings.paused && Date.now() > reactionUntil) {
      try { await api('debate', { topic: $('topic').value }); } catch { /* Reconnect banner handles a stopped server. */ }
    }
    scheduleDebate();
  }, (state?.settings.dialogueInterval ?? 35) * 1000);
}

$('pause').addEventListener('click', action(async () => { render(await api('settings', { paused: !state.settings.paused })); clearAnimation(); $('stage-speech').classList.remove('visible'); }));
$('shuffle').addEventListener('click', action(async () => {
  const pool = [...state.founders];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  render(await api('settings', { selected: pool.slice(0, 5).map(f => f.id) }));
}));
document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', action(async () => {
  if (state.settings.paused) return notice('Resume the arena to see a sample reaction.');
  if (state.settings.sound && !audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  render(await api('demo', { category: button.dataset.demo }));
})));
const debate = action(async () => {
  if (Date.now() < reactionUntil) return notice('Let this reaction finish, then start a debate.');
  render(await api('debate', { topic: $('topic').value })); scheduleDebate();
});
$('start-debate').addEventListener('click', debate); $('debate-now').addEventListener('click', debate);
$('project-form').addEventListener('submit', action(async () => {
  render(await api('project', { name: $('project-name').value, audience: $('project-audience').value, description: $('project-description').value })); notice('Project brief saved. The next debate will use it.');
}));
$('task-form').addEventListener('submit', action(async () => { render(await api('tasks', { action: 'add', text: $('task-input').value })); $('task-input').value = ''; }));
$('settings-toggle').addEventListener('click', () => {
  if (!state) return;
  $('language').value = state.settings.language; $('intensity').value = state.settings.intensity;
  $('cooldown').value = state.settings.cooldown; $('cooldown-value').textContent = `${state.settings.cooldown}s`;
  $('dialogue-interval').value = state.settings.dialogueInterval; $('interval-value').textContent = `${state.settings.dialogueInterval}s`;
  $('animation-speed').value = state.settings.animationSpeed; $('sound').checked = state.settings.sound;
  $('settings-panel').showModal();
});
$('settings-close').addEventListener('click', () => $('settings-panel').close());
$('cooldown').addEventListener('input', e => { $('cooldown-value').textContent = `${e.target.value}s`; });
$('dialogue-interval').addEventListener('input', e => { $('interval-value').textContent = `${e.target.value}s`; });
$('settings-form').addEventListener('submit', action(async () => {
  const enabled = $('sound').checked;
  if (enabled && !audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  render(await api('settings', { language: $('language').value, intensity: $('intensity').value, cooldown: Number($('cooldown').value), dialogueInterval: Number($('dialogue-interval').value), animationSpeed: Number($('animation-speed').value), sound: enabled }));
  scheduleDebate(); $('settings-panel').close(); notice('Boardroom rules saved.');
}));
$('copy-command').addEventListener('click', action(async () => { await navigator.clipboard.writeText('founder-arena run -- node app.js'); notice('Command copied. Run it in your project terminal.'); }));

const online = () => { connected = true; $('connection').classList.remove('disconnected'); $('connection').replaceChildren(node('i'), document.createTextNode(transport ? 'Browser demo' : 'Live connection')); };
let stream;
let unsubscribe;
if (transport) {
  unsubscribe = transport.subscribe(render, event => react(event));
  online();
} else {
  stream = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
  stream.addEventListener('state', event => { try { render(JSON.parse(event.data)); } catch (e) { console.error(e); notice('Could not render an arena update. Refresh to reconnect.'); } });
  stream.addEventListener('arena', event => { try { react(JSON.parse(event.data)); } catch (e) { console.error(e); } });
  stream.onopen = online;
  stream.onerror = () => { connected = false; $('connection').classList.add('disconnected'); $('connection').replaceChildren(node('i'), document.createTextNode('Reconnecting')); };
}
const cleanup = () => { stream?.close(); unsubscribe?.(); clearTimeout(dialogueTimer); clearTimeout(speechTimer); clearAnimation(); };
window.addEventListener('pagehide', cleanup, { once: true });
return cleanup;
}
if (document.querySelector('meta[name="arena-token"]')) mountArena();
