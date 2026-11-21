/* global acquireVsCodeApi */
const host = acquireVsCodeApi(),
  $ = (id) => document.getElementById(id);
let state,
  actors = [],
  fightTimers = [],
  lastFrame = 0;
const send = (type, value) => host.postMessage({ type, value });
for (const id of [
  "choose",
  "indian",
  "fight",
  "sample",
  "pause",
  "hint",
  "goto",
])
  $(id).addEventListener("click", () => send(id));
for (const id of ["language"])
  $(id).addEventListener("change", (e) => send(id, e.target.value));
$("voice").addEventListener("click", () => send("voice", !state.voice));
function stopVoice() {
  if (state?.nativeVoice) send("stopVoice");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
function say(id, word) {
  if (!state.voice || state.paused) return;
  stopVoice();
  const speakerIndex = Math.max(0, actors.findIndex((actor) => actor.founder.id === id));
  const fallback = state.language === "hinglish" ? "गधा!" : "Noob!";
  const spokenWord = word || fallback;
  if (state.nativeVoice) {
    send("speak", spokenWord);
    return;
  }
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(spokenWord);
  utterance.lang = state.language === "hinglish" ? "hi-IN" : "en-US";
  utterance.rate = 1.15;
  utterance.volume = 0.75;
  utterance.pitch = [0.9, 1.05, 1.2][speakerIndex % 3];
  const voices = window.speechSynthesis.getVoices();
  const matchingVoices = voices.filter((voice) => voice.lang.startsWith(state.language === "hinglish" ? "hi" : "en"));
  utterance.voice = matchingVoices[speakerIndex % matchingVoices.length] || null;
  window.speechSynthesis.speak(utterance);
}
function clearFight() {
  fightTimers.forEach(clearTimeout);
  fightTimers = [];
  stopVoice();
  $("stage").querySelectorAll(".impact").forEach((effect) => effect.remove());
  actors.forEach((a, i) => {
    a.bubble.hidden = true;
    a.element.classList.remove("speaking", "fighting", "attack", "hit", "punch", "kick", "spectator");
    a.x = 30 + i * Math.max(96, ($("stage").clientWidth - 120) / actors.length);
  });
}
function speak(id, text, voiceWord) {
  actors.forEach((a) => {
    a.bubble.hidden = true;
    a.element.classList.remove("speaking");
  });
  const a = actors.find((a) => a.founder.id === id) || actors[0];
  if (!a) return;
  a.bubble.textContent = text;
  say(a.founder.id, voiceWord);
  a.bubble.hidden = false;
  a.element.classList.add("speaking");
  a.until = Date.now() + (voiceWord ? 1800 : 6500);
  a.x = Math.max(88, Math.min($("stage").clientWidth - 160, a.x));
  $("welcome").hidden = true;
}
function render(next) {
  state = next;
  if (state.paused) clearFight();
  else if (!state.voice) stopVoice();
  $("pause").textContent = state.paused ? "Resume" : "Pause";
  $("voice").textContent = `Voice: ${state.voice ? "on" : "off"}`;
  $("voice").setAttribute("aria-pressed", String(state.voice));
  $("voice").disabled = !state.nativeVoice && !("speechSynthesis" in window);
  $("voice").title = $("voice").disabled
    ? "Voice is unavailable in this editor"
    : "Speak founder roasts aloud";
  $("language").value = state.language;
  if (
    actors.map((a) => a.founder.id).join() ===
    state.founders.map((f) => f.id).join()
  )
    return;
  clearFight();
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
    const limbs = document.createElement("div");
    limbs.className = "limbs";
    for (const part of ["arm left", "arm right", "leg left", "leg right"]) {
      const limb = document.createElement("i");
      limb.className = part.replace(" ", "-");
      limbs.append(limb);
    }
    element.append(bubble, sprite, limbs, name);
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
function impact(target) {
  const effect = document.createElement("div");
  effect.className = "impact";
  effect.style.left = `${target.x + 35}px`;
  for (let i = 0; i < 8; i++) {
    const pixel = document.createElement("i");
    pixel.className = i < 5 ? "dust" : "red-pixel";
    pixel.style.setProperty("--dx", `${(i % 4 - 1.5) * 22}px`);
    pixel.style.setProperty("--dy", `${-22 - (i % 3) * 14}px`);
    effect.append(pixel);
  }
  $("stage").append(effect);
  fightTimers.push(setTimeout(() => effect.remove(), 1300));
}
window.addEventListener("message", ({ data: m }) => {
  if (m.type === "state") render(m);
  else if (m.type === "reaction") {
    clearFight();
    speak(m.founderId, m.roast);
    $("message").textContent =
      `${m.error.file ? `${m.error.file}:${m.error.line} · ` : ""}${m.error.message}`;
    $("learning").hidden = false;
    $("goto").hidden = !m.error.file;
    $("hintText").textContent = m.error.guide.meaning;
  } else if (m.type === "hint") $("hintText").textContent = m.text;
  else if (m.type === "success") {
    clearFight();
    $("message").textContent = m.text;
    $("learning").hidden = true;
    actors.forEach((a) => {
      a.element.classList.add("celebrate");
      setTimeout(() => a.element.classList.remove("celebrate"), 1800);
    });
  } else if (m.type === "fight") {
    clearFight();
    $("learning").hidden = true;
    m.turns.forEach((turn, i) =>
      fightTimers.push(
        setTimeout(() => {
          const attacker = actors.find(a => a.founder.id === turn.founderId);
          const target = actors.find(a => a.founder.id === turn.targetId);
          if (attacker && target) {
            const center = $("stage").clientWidth / 2 - 40;
            attacker.x = Math.max(8, center - 100);
            target.x = Math.min($("stage").clientWidth - 88, center + 100);
            actors.filter((actor) => actor !== attacker && actor !== target).forEach((actor) => {
              actor.x = Math.max(8, center - 320);
              actor.element.classList.add("spectator");
            });
            attacker.element.classList.remove("spectator");
            target.element.classList.remove("spectator");
            attacker.element.classList.add("fighting", "attack", turn.move);
            target.element.classList.add("hit");
            impact(target);
            fightTimers.push(setTimeout(() => {
              attacker.element.classList.remove("attack", "punch", "kick");
              target.element.classList.remove("hit");
            }, 900));
          }
          speak(turn.founderId, turn.word, turn.word);
          $("message").textContent = "Pixel fight · Fictional parody";
        }, i * 2300),
      ),
    );
    fightTimers.push(
      setTimeout(() => {
        clearFight();
        $("message").textContent = "Round over · Keep coding";
      }, m.turns.length * 2300),
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
      !speaking && fightTimers.length === 0 &&
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
