const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CompanionController,
  diagnosticText,
  shortDebateRoast,
} = require("../src/controller.cjs");
async function fixture() {
  const core = await import("founder-fightclub/browser");
  const uri = { toString: () => "file:///demo.js" },
    messages = [];
  let diagnostics = [];
  const v = {
    workspace: {
      getConfiguration: () => ({ get: (k, f) => (k === "cooldown" ? 0 : f) }),
      asRelativePath: () => "demo.js",
      workspaceFolders: [{ name: "Test project" }],
    },
    window: { activeTextEditor: { document: { uri } } },
    languages: { getDiagnostics: () => diagnostics },
    DiagnosticSeverity: { Error: 0 },
  };
  const c = new CompanionController(v, core, {
    globalState: { get: (_, f) => f, update: async () => {} },
  });
  c.view = { visible: true, webview: { postMessage: (m) => messages.push(m) } };
  return { c, messages, setDiagnostics: (d) => (diagnostics = d) };
}
const error = {
  message: "')' expected.",
  code: 1005,
  severity: 0,
  range: { start: { line: 1, character: 20 } },
};
test("real diagnostics trigger one roast and an English guide; fixing them celebrates", async () => {
  const { c, messages, setDiagnostics } = await fixture();
  setDiagnostics([error]);
  c.inspectDiagnostics();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, "reaction");
  assert.equal(messages[0].error.line, 2);
  assert.match(messages[0].error.guide.title, /syntax/i);
  assert.ok(messages[0].roast);
  c.inspectDiagnostics();
  assert.equal(messages.length, 1);
  setDiagnostics([]);
  c.inspectDiagnostics();
  assert.equal(messages[1].type, "success");
  c.inspectDiagnostics();
  assert.equal(messages.length, 2);
});
test("warnings, hidden panel and paused state do not trigger roasts", async () => {
  const { c, messages, setDiagnostics } = await fixture();
  setDiagnostics([{ ...error, severity: 1 }]);
  c.inspectDiagnostics();
  assert.equal(messages.length, 0);
  setDiagnostics([error]);
  c.paused = true;
  c.inspectDiagnostics();
  c.paused = false;
  c.view.visible = false;
  c.inspectDiagnostics();
  assert.equal(messages.length, 0);
  c.view.visible = true;
  c.inspectDiagnostics();
  assert.equal(messages.length, 1);
});
test("all configured debate topics use founder objects and include targeted roasts", async () => {
  const { c, messages } = await fixture();
  for (const topic of c.core.topics) {
    c.config = () => ({ get: (k, f) => (k === "topic" ? topic : f) });
    c.debate();
    const d = messages.at(-1).debate;
    assert.equal(d.topic, topic);
    assert.equal(d.lines.length, 3);
    for (const line of d.lines) {
      assert.ok(c.selected.includes(line.founderId));
      assert.ok(line.roast);
      assert.notEqual(line.founderId, line.targetId);
      assert.ok(line.roast.split(/\s+/).length <= 18);
      assert.ok(line.roast.length <= 130);
    }
  }
});
test("debate punchlines drop the added second jab", () => {
  assert.equal(shortDebateRoast("Jensen, your MRR is imaginary. Put the GPU away."), "Jensen, your MRR is imaginary.");
  assert.equal(shortDebateRoast("Elon, scale scale bol raha hai. Pehla customer kidhar hai? Extra jab."), "Elon, scale scale bol raha hai.");
});
test("diagnostics map language-server messages to useful guides", () => {
  assert.match(diagnosticText(error), /^SyntaxError/);
  assert.match(
    diagnosticText({ message: "Cannot find name 'x'.", code: 2304 }),
    /^ReferenceError/,
  );
  assert.match(
    diagnosticText({ message: "Missing dependency", code: 2307 }),
    /^Cannot find module/,
  );
});
test("webview cannot invoke arbitrary commands or inject error locations", async () => {
  const { c, messages } = await fixture();
  await c.handle({ type: "executeCommand", value: "evil" });
  await c.handle({ type: "goto", uri: "/etc/passwd" });
  assert.equal(messages.length, 0);
  assert.equal(c.errorLocation, undefined);
});
test('random founder selection always produces a member of the chosen cast', async () => {
 const {c,messages}=await fixture();
 for(let i=0;i<150;i++){c.react('SyntaxError: Unexpected token )');assert.ok(c.selected.includes(messages.at(-1).founderId));}
});
