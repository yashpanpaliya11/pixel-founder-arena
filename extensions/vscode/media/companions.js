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
function clearDebate() {
  debateTimers.forEach(clearTimeout);
  debateTimers = [];
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
  a.bubble.hidden = false;
  a.element.classList.add("speaking");
  a.until = Date.now() + 14000;
  a.x = Math.max(88, Math.min($("stage").clientWidth - 160, a.x));
  $("welcome").hidden = true;
}
function render(next) {
  state = next;
  $("pause").textContent = state.paused ? "Resume" : "Pause";
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
    const img = document.createElement("img");
    img.src = state.assets[f.sheet];
    img.alt = `${f.name} holding a ${f.company} badge`;
    img.style.left = `${-f.column * 72}px`;
    img.style.top = `${-f.row * 120}px`;
    sprite.append(img);
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
          Math.max(85, ($("stage").clientWidth - 120) / state.founders.length),
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
          speak(line.founderId, `${line.roast} ${line.text}`);
          $("message").textContent =
            `${m.debate.topic} debate · ${m.debate.note}`;
        }, i * 9000),
      ),
    );
    debateTimers.push(
      setTimeout(() => {
        $("message").textContent = m.debate.takeaway;
      }, m.debate.lines.length * 9000),
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
      if (a.x > width - 80) {
        a.x = Math.max(0, width - 80);
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
send("ready");
