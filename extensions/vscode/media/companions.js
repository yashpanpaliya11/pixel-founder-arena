/* global acquireVsCodeApi */
const host = acquireVsCodeApi(),
  $ = (id) => document.getElementById(id);
let state,
  actors = [],
  debateTimers = [],
  lastFrame = 0;
const send = (type, value) => host.postMessage({ type, value });
for (const id of [
  "choose",
  "indian",
  "debate",
  "sample",
  "pause",
  "hint",
  "goto",
])
  $(id).addEventListener("click", () => send(id));
for (const id of ["language", "topic"])
  $(id).addEventListener("change", (e) => send(id, e.target.value));
$("voice").addEventListener("click", () => send("voice", !state.voice));
function stopVoice() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
function say(id) {
  if (!state.voice || state.paused || !("speechSynthesis" in window)) return;
  stopVoice();
  const speakerIndex = Math.max(0, actors.findIndex((actor) => actor.founder.id === id));
  const words = state.language === "hinglish"
    ? ["Gadha!", "Dhakkan!", "Nalayak!"]
    : ["Noob!", "Clown!", "Idiot!"];
  const utterance = new SpeechSynthesisUtterance(words[speakerIndex % words.length]);
  utterance.lang = state.language === "hinglish" ? "hi-IN" : "en-US";
  utterance.rate = 1.15;
  utterance.volume = 0.75;
  utterance.pitch = [0.9, 1.05, 1.2][speakerIndex % 3];
  const voices = window.speechSynthesis.getVoices();
  const matchingVoices = voices.filter((voice) => voice.lang.startsWith(state.language === "hinglish" ? "hi" : "en"));
  utterance.voice = matchingVoices[speakerIndex % matchingVoices.length] || null;
  window.speechSynthesis.speak(utterance);
}
function clearDebate() {
  debateTimers.forEach(clearTimeout);
  debateTimers = [];
  stopVoice();
  actors.forEach((a) => {
    a.bubble.hidden = true;
    a.element.classList.remove("speaking");
  });
}
function speak(id, text) {
  actors.forEach((a) => {
    a.bubble.hidden = true;
    a.element.classList.remove("speaking");
  });
  const a = actors.find((a) => a.founder.id === id) || actors[0];
  if (!a) return;
  a.bubble.textContent = text;
  say(a.founder.id);
  a.bubble.hidden = false;
  a.element.classList.add("speaking");
  a.until = Date.now() + 6500;
  a.x = Math.max(88, Math.min($("stage").clientWidth - 160, a.x));
  $("welcome").hidden = true;
}
function render(next) {
  state = next;
  if (state.paused) clearDebate();
  else if (!state.voice) stopVoice();
  $("pause").textContent = state.paused ? "Resume" : "Pause";
  $("voice").textContent = `Voice: ${state.voice ? "on" : "off"}`;
  $("voice").setAttribute("aria-pressed", String(state.voice));
  $("voice").disabled = !("speechSynthesis" in window);
  $("voice").title = $("voice").disabled
    ? "Voice is unavailable in this editor"
    : "Speak founder roasts aloud";
  $("language").value = state.language;
  $("topic").replaceChildren(
    ...state.topics.map((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      return o;
    }),
  );
  $("topic").value = state.topic;
  if (
    actors.map((a) => a.founder.id).join() ===
    state.founders.map((f) => f.id).join()
  )
    return;
  clearDebate();
  $("actors").replaceChildren();
  actors = state.founders.map((f, i) => {
    const element = document.createElement("div");
    element.className = "actor";
    const sprite = document.createElement("div");
    sprite.className = "sprite";
    sprite.setAttribute("role", "img");
    sprite.setAttribute("aria-label", `${f.name} holding a ${f.company} badge`);
    sprite.style.backgroundImage = `url("${state.assets[f.sheet]}")`;
    sprite.style.backgroundPosition = `${-f.column * 80}px ${-f.row * 133.33}px`;
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = f.name;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.hidden = true;
    element.append(bubble, sprite, name);
    $("actors").append(element);
    return {
      founder: f,
      element,
      bubble,
      x:
        30 +
        i *
          Math.max(96, ($("stage").clientWidth - 120) / state.founders.length),
      direction: i % 2 ? 1 : -1,
      until: 0,
    };
  });
}
window.addEventListener("message", ({ data: m }) => {
  if (m.type === "state") render(m);
  else if (m.type === "reaction") {
    clearDebate();
    speak(m.founderId, m.roast);
    $("message").textContent =
      `${m.error.file ? `${m.error.file}:${m.error.line} · ` : ""}${m.error.message}`;
    $("learning").hidden = false;
    $("goto").hidden = !m.error.file;
    $("hintText").textContent = m.error.guide.meaning;
  } else if (m.type === "hint") $("hintText").textContent = m.text;
  else if (m.type === "success") {
    clearDebate();
    $("message").textContent = m.text;
    $("learning").hidden = true;
    actors.forEach((a) => {
      a.element.classList.add("celebrate");
      setTimeout(() => a.element.classList.remove("celebrate"), 1800);
    });
  } else if (m.type === "debate") {
    clearDebate();
    $("learning").hidden = true;
    m.debate.lines.forEach((line, i) =>
      debateTimers.push(
        setTimeout(() => {
          speak(line.founderId, line.roast);
          const attacker = actors.find(a => a.founder.id === line.founderId);
          const target = actors.find(a => a.founder.id === line.targetId);
          if (attacker && target) {
            attacker.x = Math.max(8, Math.min($("stage").clientWidth - 130, target.x + (attacker.x < target.x ? -72 : 72)));
            attacker.element.classList.add("attack");
            target.element.classList.add("hit");
            debateTimers.push(setTimeout(() => { attacker.element.classList.remove("attack"); target.element.classList.remove("hit"); }, 1300));
          }
          $("message").textContent =
            `${m.debate.topic} debate · ${m.debate.note}`;
        }, i * 6500),
      ),
    );
    debateTimers.push(
      setTimeout(() => {
        $("message").textContent = m.debate.takeaway;
      }, m.debate.lines.length * 6500),
    );
  }
});
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  const width = $("stage").clientWidth;
  for (const a of actors) {
    const speaking = !a.bubble.hidden;
    if (speaking && Date.now() > a.until) {
      a.bubble.hidden = true;
      a.element.classList.remove("speaking");
    }
    const walking =
      !state.paused &&
      !speaking &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    a.element.classList.toggle("walking", walking);
    if (walking) {
      a.x += a.direction * 13 * dt;
      if (a.x > width - 90) {
        a.x = Math.max(0, width - 90);
        a.direction = -1;
      }
      if (a.x < 5) {
        a.x = 5;
        a.direction = 1;
      }
    }
    a.element.style.left = `${a.x}px`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener("pagehide", stopVoice);
send("ready");
