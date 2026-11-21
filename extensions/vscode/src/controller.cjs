const { randomBytes } = require("node:crypto");
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
class CompanionController {
  constructor(vscode, core, context) {
    Object.assign(this, { vscode, core, context });
    this.disposables = [];
    this.selected = context.globalState.get("selected", [
      "elon",
      "jensen",
      "anupam",
      "peyush",
      "aadit",
    ]);
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
        this.setCast(["anupam", "peyush", "aadit", "aman", "nithin"]),
      togglePause: () => this.togglePause(),
      language: () => this.language(),
      debate: () => this.debate(),
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
          this.startDebates();
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
    this.startDebates();
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
      topics: this.core.topics,
      topic: this.config().get("topic", "MRR"),
    });
  }
  async handle(m) {
    try {
      if (m?.type === "ready") {
        this.state();
        this.scheduleDiagnostics();
      } else if (m?.type === "choose") await this.choose();
      else if (m?.type === "indian")
        await this.setCast(["anupam", "peyush", "aadit", "aman", "nithin"]);
      else if (m?.type === "pause") await this.togglePause();
      else if (m?.type === "language" && ["en", "hinglish"].includes(m.value))
        await this.config().update(
          "language",
          m.value,
          this.vscode.ConfigurationTarget.Global,
        );
      else if (m?.type === "topic" && this.core.topics.includes(m.value))
        await this.config().update(
          "topic",
          m.value,
          this.vscode.ConfigurationTarget.Global,
        );
      else if (m?.type === "debate") this.debate();
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
      { canPickMany: true, title: "Choose two to five pixel founders" },
    );
    if (!p) return;
    if (p.length < 2 || p.length > 5) {
      this.vscode.window.showInformationMessage(
        "Choose between two and five founders.",
      );
      return;
    }
    await this.setCast(p.map((f) => f.id));
  }
  async setCast(ids) {
    this.selected = ids;
    await this.context.globalState.update("selected", ids);
    this.state();
  }
  async togglePause() {
    this.paused = !this.paused;
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
  debate() {
    if (this.paused) return;
    this.post({
      type: "debate",
      debate: this.core.createDebate({
        topic: this.config().get("topic", "MRR"),
        cast: this.core.founders.filter((f) => this.selected.includes(f.id)),
        language: this.config().get("language", "en"),
        intensity: this.config().get("intensity", "funny"),
        project: {
          name:
            this.vscode.workspace.workspaceFolders?.[0]?.name || "Your project",
        },
      }),
    });
  }
  startDebates() {
    clearInterval(this.debateTimer);
    this.debateTimer = setInterval(
      () => {
        if (
          this.view?.visible &&
          !this.paused &&
          this.config().get("backgroundDebates", true) &&
          Date.now() - this.lastReaction > 20000
        )
          this.debate();
      },
      Math.max(30, this.config().get("debateInterval", 60)) * 1000,
    );
  }
  dispose() {
    clearTimeout(this.diagnosticTimer);
    clearInterval(this.debateTimer);
    this.disposables.forEach((d) => d.dispose());
  }
}
module.exports = { CompanionController, diagnosticText };
