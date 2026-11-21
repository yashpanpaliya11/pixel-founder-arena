const { randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
function diagnosticText(d) {
  const m = d.message,
    c = Number(d.code?.value ?? d.code);
  return (
    (/cannot find module|cannot find package/i.test(m) || c === 2307
      ? "Cannot find module: "
      : /cannot find name|not defined/i.test(m) || c === 2304
        ? "ReferenceError: "
        : /expected|unexpected|unterminated/i.test(m) ||
            [1005, 1109, 1128, 1160].includes(c)
          ? "SyntaxError: "
          : "TypeError: ") + m
  );
}
const fightWords = {
  en: ["Noob!", "Clown!", "Idiot!", "Amateur!", "Loser!", "Goof!"],
  hinglish: ["गधा!", "ढक्कन!", "नालायक!", "बेवकूफ़!", "निकम्मा!", "बकवास!"],
};
class CompanionController {
  constructor(vscode, core, context) {
    Object.assign(this, { vscode, core, context });
    this.disposables = [];
    this.selected = context.globalState.get("selected", [
      "elon",
      "jensen",
      "anupam",
    ]).slice(0, 3);
    this.paused = context.globalState.get("paused", false);
    this.lastSeen = new Map();
    this.lastReaction = 0;
    this.hintIndex = 0;
  }
  config() {
    return this.vscode.workspace.getConfiguration("founderFightclub");
  }
  register() {
    const v = this.vscode;
    this.disposables.push(
      v.window.registerWebviewViewProvider(
        "founderFightclub.companions",
        this,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
    );
    const actions = {
      open: () =>
        v.commands.executeCommand("workbench.view.extension.founderFightclub"),
      chooseFounders: () => this.choose(),
      indianCast: () =>
        this.setCast(["anupam", "peyush", "aadit"]),
      togglePause: () => this.togglePause(),
      language: () => this.language(),
      fight: () => this.fight(),
      sample: () => this.sample(),
    };
    for (const [n, a] of Object.entries(actions))
      this.disposables.push(
        v.commands.registerCommand(`founderFightclub.${n}`, a),
      );
    this.disposables.push(
      v.languages.onDidChangeDiagnostics(() => this.scheduleDiagnostics()),
      v.window.onDidChangeActiveTextEditor(() => this.scheduleDiagnostics()),
      v.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("founderFightclub")) {
          this.state();
          this.startFights();
        }
      }),
      v.tasks.onDidEndTaskProcess((e) => {
        if (this.paused || !this.view?.visible || e.exitCode === undefined)
          return;
        this.post({
          type: "success",
          text:
            e.exitCode === 0
              ? `Task “${e.execution.task.name}” passed. Ship it!`
              : `Task “${e.execution.task.name}” exited with code ${e.exitCode}. Check its terminal output.`,
        });
      }),
    );
    const s = v.window.createStatusBarItem(v.StatusBarAlignment.Left, 10);
    s.text = "$(smiley) Founder Fightclub";
    s.command = "founderFightclub.open";
    s.show();
    this.disposables.push(s);
  }
  resolveWebviewView(view) {
    this.view = view;
    const v = this.vscode,
      c = this.context,
      media = v.Uri.joinPath(c.extensionUri, "media"),
      assets = v.Uri.joinPath(
        c.extensionUri,
        "node_modules",
        "founder-fightclub",
        "public",
        "assets",
      );
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [media, assets],
    };
    const nonce = randomBytes(18).toString("hex"),
      uri = (n) =>
        view.webview.asWebviewUri(v.Uri.joinPath(media, n)).toString();
    this.assetUris = Object.fromEntries(
      ["founders", "tech", "india"].map((n) => [
        n,
        view.webview
          .asWebviewUri(v.Uri.joinPath(assets, `${n}.png`))
          .toString(),
      ]),
    );
    view.webview.html = readFileSync(
      join(c.extensionPath, "media", "companions.html"),
      "utf8",
    )
      .replaceAll("{{csp}}", view.webview.cspSource)
      .replaceAll("{{nonce}}", nonce)
      .replace("{{style}}", uri("companions.css"))
      .replace("{{script}}", uri("companions.js"));
    this.disposables.push(
      view.webview.onDidReceiveMessage((m) => this.handle(m)),
      view.onDidChangeVisibility(() => {
        if (view.visible) {
          this.state();
          this.scheduleDiagnostics();
        }
      }),
    );
    this.startFights();
  }
  post(m) {
    this.view?.webview.postMessage(m);
  }
  state() {
    this.post({
      type: "state",
      founders: this.core.founders.filter((f) => this.selected.includes(f.id)),
      assets: this.assetUris,
      paused: this.paused,
      language: this.config().get("language", "en"),
      voice: this.config().get("voice", true),
      nativeVoice: process.platform === "darwin",
    });
  }
  async handle(m) {
    try {
      if (m?.type === "ready") {
        this.state();
        this.scheduleDiagnostics();
      } else if (m?.type === "choose") await this.choose();
      else if (m?.type === "indian")
        await this.setCast(["anupam", "peyush", "aadit"]);
      else if (m?.type === "pause") await this.togglePause();
      else if (m?.type === "language" && ["en", "hinglish"].includes(m.value))
        await this.config().update(
          "language",
          m.value,
          this.vscode.ConfigurationTarget.Global,
        );
      else if (m?.type === "voice" && typeof m.value === "boolean")
        await this.config().update(
          "voice",
          m.value,
          this.vscode.ConfigurationTarget.Global,
        );
      else if (m?.type === "speak" &&
        Object.values(fightWords).some((words) => words.includes(m.value)))
        this.speakWord(m.value);
      else if (m?.type === "stopVoice") this.stopVoice();
      else if (m?.type === "fight") this.fight();
      else if (m?.type === "sample") this.sample();
      else if (m?.type === "hint" && this.latestError) {
        const h = this.latestError.guide.hints;
        this.post({
          type: "hint",
          text: h[Math.min(this.hintIndex++, h.length - 1)],
        });
      } else if (m?.type === "goto" && this.errorLocation) {
        const { uri, range } = this.errorLocation,
          e = await this.vscode.window.showTextDocument(uri);
        e.selection = new this.vscode.Selection(range.start, range.start);
        e.revealRange(range);
      }
    } catch (e) {
      this.vscode.window.showErrorMessage(`Founder Fightclub: ${e.message}`);
    }
  }
  async choose() {
    const p = await this.vscode.window.showQuickPick(
      this.core.founders.map((f) => ({
        label: f.name,
        description: f.company,
        id: f.id,
        picked: this.selected.includes(f.id),
      })),
      { canPickMany: true, title: "Choose two or three pixel founders" },
    );
    if (!p) return;
    if (p.length < 2 || p.length > 3) {
      this.vscode.window.showInformationMessage(
        "Choose two or three founders.",
      );
      return;
    }
    await this.setCast(p.map((f) => f.id));
  }
  async setCast(ids) {
    this.selected = ids.slice(0, 3);
    await this.context.globalState.update("selected", this.selected);
    this.state();
  }
  async togglePause() {
    this.paused = !this.paused;
    if (this.paused) this.stopVoice();
    await this.context.globalState.update("paused", this.paused);
    this.state();
  }
  async language() {
    const c = await this.vscode.window.showQuickPick(
      [
        { label: "English", value: "en" },
        { label: "Hinglish", value: "hinglish" },
      ],
      { title: "Roast language" },
    );
    if (c)
      await this.config().update(
        "language",
        c.value,
        this.vscode.ConfigurationTarget.Global,
      );
  }
  scheduleDiagnostics() {
    clearTimeout(this.diagnosticTimer);
    this.diagnosticTimer = setTimeout(() => this.inspectDiagnostics(), 900);
  }
  inspectDiagnostics() {
    const e = this.vscode.window.activeTextEditor;
    if (!e || this.paused || !this.view?.visible) return;
    const uri = e.document.uri,
      errors = this.vscode.languages
        .getDiagnostics(uri)
        .filter((d) => d.severity === this.vscode.DiagnosticSeverity.Error),
      key = uri.toString(),
      before = this.lastSeen.get(key),
      fingerprint = JSON.stringify(
        errors.map((d) => [
          d.message,
          d.range.start.line,
          d.range.start.character,
        ]),
      );
    if (fingerprint === before) return;
    this.lastSeen.set(key, fingerprint);
    if (!errors.length) {
      if (before && before !== "[]") {
        this.latestError = null;
        this.errorLocation = null;
        this.post({
          type: "success",
          text: "No editor errors left in this file. Nice fix!",
        });
      }
      return;
    }
    if (
      Date.now() - this.lastReaction <
      this.config().get("cooldown", 12) * 1000
    ) {
      this.lastSeen.set(key, before);
      return;
    }
    const d = errors[0];
    this.errorLocation = { uri, range: d.range };
    this.react(diagnosticText(d), {
      message: d.message,
      file: this.vscode.workspace.asRelativePath(uri),
      line: d.range.start.line + 1,
    });
  }
  react(text, location = {}) {
    if (this.paused) return;
    const id = this.selected[Math.floor(Math.random() * this.selected.length)];
    const founder = this.core.founders.find(f => f.id === id) ?? this.core.founders[0];
    const result = this.core.classifyError(text);
    this.latestError = result;
    this.hintIndex = 0;
    this.lastReaction = Date.now();
    const roast = this.core.chooseRoast({
      founder,
      category: result.category,
      language: this.config().get("language", "en"),
      intensity: this.config().get("intensity", "funny"),
      previous: this.lastRoast,
    });
    this.lastRoast = roast;
    this.post({
      type: "reaction",
      founderId: founder.id,
      roast,
      error: { ...location, guide: result.guide },
    });
  }
  sample() {
    this.errorLocation = null;
    this.react("SyntaxError: Unexpected token )", {
      message: "Sample syntax error — this is a demonstration.",
    });
  }
  fight() {
    if (this.paused) return;
    const cast = this.selected.filter((id) => this.core.founders.some((f) => f.id === id));
    if (cast.length < 2) return;
    const language = this.config().get("language", "en") === "hinglish" ? "hinglish" : "en";
    const words = fightWords[language];
    this.post({
      type: "fight",
      turns: Array.from({ length: 6 }, (_, i) => ({
        founderId: cast[i % cast.length],
        targetId: cast[(i + 1) % cast.length],
        word: words[(i + Math.floor(Math.random() * words.length)) % words.length],
        move: i % 2 ? "kick" : "punch",
      })),
    });
  }
  speakWord(word) {
    if (process.platform !== "darwin" || this.paused || !this.config().get("voice", true)) return;
    this.stopVoice();
    const voice = fightWords.hinglish.includes(word) ? "Lekha" : "Samantha";
    this.voiceProcess = spawn("say", ["-v", voice, word], { stdio: "ignore" });
    this.voiceProcess.on("error", () => { this.voiceProcess = null; });
  }
  stopVoice() {
    this.voiceProcess?.kill();
    this.voiceProcess = null;
  }
  startFights() {
    clearInterval(this.fightTimer);
    this.stopVoice();
    this.fightTimer = setInterval(
      () => {
        if (
          this.view?.visible &&
          !this.paused &&
          this.config().get("backgroundFights", true) &&
          Date.now() - this.lastReaction > 20000
        )
          this.fight();
      },
      Math.max(30, this.config().get("fightInterval", 60)) * 1000,
    );
  }
  dispose() {
    clearTimeout(this.diagnosticTimer);
    clearInterval(this.fightTimer);
    this.disposables.forEach((d) => d.dispose());
  }
}
module.exports = { CompanionController, diagnosticText, fightWords };
