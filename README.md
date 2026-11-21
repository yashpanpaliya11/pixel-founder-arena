# Founder Arena

**Big founders. Small pixels. Zero chill.**

A local npm CLI and reusable JavaScript library that gives your terminal a tiny audience. Pixel tech characters debate startup topics, react to coding errors with English or Hinglish roasts, and offer progressive beginner-friendly debugging hints.

Runs offline. No accounts, model calls, telemetry, runtime dependencies, or API keys. Node.js **22+** required.

## Public project links

- [Package source](https://github.com/yashpanpaliya11/pixel-founder-arena)
- [Separate demo project](https://github.com/yashpanpaliya11/pixel-founder-arena-demo), which installs this package as an npm dependency
- [Packaged releases](https://github.com/yashpanpaliya11/pixel-founder-arena/releases)

Install the public GitHub release with npm:

```sh
npm install --global https://github.com/yashpanpaliya11/pixel-founder-arena/releases/download/v1.2.0/pixel-founder-arena-1.2.0.tgz
founder-arena demo
```

## Browser integration

Version 1.2 adds a browser-safe entry point, used by the separate hosted demo:

```js
import { createBrowserDemo, founders, classifyError } from 'pixel-founder-arena/browser';

const demo = createBrowserDemo({ storage: window.localStorage });
demo.subscribe(state => console.log(state), event => console.log(event));
await demo.request('demo', { category: 'syntax' });
await demo.request('debate', { topic: 'MRR' });
```

`createBrowserDemo` drives sample events and browser-local state. It never executes arbitrary code or monitors a visitor's device. Reusable UI resources are exported as `pixel-founder-arena/ui/app.js`, `pixel-founder-arena/ui/style.css`, and `pixel-founder-arena/ui/index.html`. The `mountArena({ transport })` export in the UI module accepts the browser transport; the CLI UI continues to use the local HTTP/SSE server.

## Try the delivered source

From this folder:

```sh
npm start
npm run demo
```

The command prints a local URL and opens the arena in your default browser. `Ctrl+C` stops it. No dependency installation or build step is necessary.

For an actual error:

```sh
node bin/founder-arena.js run --language hinglish -- node examples/broken.js
```

`examples/broken.js` deliberately references an undefined variable. Read the terminal output, then open **Explain this error + progressive hints** in the arena. For a clean run, use `examples/fixed.js`.

## Install the tarball

The accompanying `pixel-founder-arena-1.2.0.tgz` is an installable npm package. From the folder containing it:

```sh
npm install --global ./pixel-founder-arena-1.2.0.tgz
founder-arena demo
```

Or install it into another project:

```sh
npm install --save-dev /absolute/path/to/pixel-founder-arena-1.2.0.tgz
npx founder-arena run -- node app.js
```

The package has **not** been published to the npm registry as part of this delivery. After it is published under an available name, users can install that name or execute it with `npx`. `founder-arena` is the executable name; `pixel-founder-arena` is the package name.

## What works in version 1

- 25 bundled pixel characters holding company-logo badges; choose two to five for your active cast.
- Topic-specific founder-versus-founder roasts with rotating speakers, direct targets, and replies. Debate roasts follow the English/Hinglish and intensity settings; practical advice stays English.
- Idle, talking, attack/lunge, and celebration motions applied to static character art.
- Scripted debates about MRR, marketing, bootstrapping, competitors, product, and AI.
- A project brief that personalizes debate prompts with your project name, audience, and description context.
- Real command stdout/stderr monitoring with original output forwarded to your terminal.
- Heuristic recognition of syntax, reference, type, missing-module, assertion/test, range, and general command errors.
- English/Hinglish **roasts only**. UI, debates, hints, notes, and documentation stay English.
- Chill/funny/savage levels, cooldown, repeated-error deduplication, sound, pause, animation speed, and background debate interval.
- English explanations, three progressive hints, and a learning example for each supported error category.
- Founder-to-founder topic-specific roasts in debates, with named targets, rotating speakers, and the same language/intensity settings as coding-error roasts. Practical arguments and takeaways remain English.
- A task list, +20 XP for first completion of each task, +10 XP for each successful wrapped command, levels, and saved preferences.
- Sample events that do not affect real progress counters.
- A reusable ESM API with TypeScript declarations and JSON custom-character/roast packs.
- Responsive layout, labeled controls, keyboard access, and reduced-motion support.

All characters and their dialogue are fictional parody. Company badges show brand associations, not current job titles or endorsements. See [ASSETS.md](./ASSETS.md).

## Use it while coding

In an IDE terminal, run your usual command through the CLI:

```sh
founder-arena run -- node app.js
founder-arena run -- npm test
founder-arena run -- npm run build
founder-arena run -- node --watch app.js
```

**A single terminal run monitors only the command it wraps.** It does not watch unrelated terminals or editor underlines. `node --watch` re-runs the JavaScript program when watched files change; Founder Arena observes that process output. Start this from your actual project's directory so the command uses the right working directory.

The browser arena stays open after the command finishes, so you can read the reaction and hints. Press `Ctrl+C` to close it. For scripts/CI, use `--exit` to close automatically and return the child command's exit code:

```sh
founder-arena run --no-open --exit -- npm test
```

No arbitrary commands can be launched from the web UI. Commands run only when you explicitly supply them to the CLI or library.

## CLI reference

```text
founder-arena [serve] [options]
founder-arena demo [options]
founder-arena run [options] -- EXECUTABLE [ARGUMENTS...]
founder-arena founders

--no-open              Do not automatically open a browser
--port NUMBER          Bind a specific loopback port; default is automatic
--language en|hinglish Roast language
--intensity LEVEL      chill, funny, savage
--pack FILE            Custom characters/roasts JSON file
--state FILE           State file path
--exit                 Close after wrapped command ends
--help / -h            Show usage
--version / -v         Show version
```

Options belong **before** `--`. Everything after it is passed as executable arguments, without shell interpolation. For shell features, intentionally run your shell yourself, e.g. `founder-arena run -- sh -c 'npm test && npm run build'`. Do not pass untrusted text to a shell.

macOS/Linux direct executable and npm command paths are implemented and tested on macOS. Windows browser opening and npm/npx forwarding are implemented but have not been verified on a Windows host. On Windows use `npm exec -- founder-arena run -- npm test` so the npm CLI path is available, or pass `node` and the script path directly. Windows `.cmd`/`.bat` tools are not launched through an implicit shell. Interactive stdin is forwarded, but stdout/stderr are pipes rather than a pseudo-terminal; highly interactive full-screen CLIs may behave differently.

## Settings and local data

Settings, project brief, task list, and aggregate counters are saved in `.founder-arena/state.json` in the directory where the CLI starts. Add `.founder-arena/` to your project's `.gitignore`. Use `--state /path/to/state.json` to choose another location. Sessions using the same state file concurrently are unsupported; choose different paths.

The most recent 60 events and error snippets are kept **in process memory only** and reset when the server stops. Raw command output is not saved to disk by the package. The server binds to `127.0.0.1`, requires a per-session token for API access, rejects foreign origins, and serves only bundled files. Nothing is sent to a remote service. Your browser may still display any sensitive text that your own command prints; avoid exposing secrets in command output.

Background debates run while the arena is visible in a browser tab. Pause quiets character reactions and stops automatic debates, while error monitoring and terminal output continue. Sound starts only after a browser interaction permits audio. XP is a playful activity counter, not an assessment of coding ability.

## Custom character packs

```sh
founder-arena --pack examples/custom-founders.json
```

Example JSON:

```json
[
  {
    "id": "rubber-duck",
    "name": "Rubber Duck",
    "company": "Your desk",
    "specialty": "Debugging",
    "color": "#efcf66",
    "roasts": {
      "en": ["Explain that line to me. Slowly. I am a duck."],
      "hinglish": ["Scope check kar le bhai."]
    }
  }
]
```

Select the new character in the roster after loading the pack. Each ID must be unique, lowercase, and different from bundled IDs. Packs are data-only, with up to 50 characters; no scripts are executed. Version 1 uses initial-letter avatars for custom characters. Bundled sprite mapping can be extended in source for your own local artwork. Packs contain general error roasts; bundled characters also have category-specific dialogue.

## JavaScript API

After installation:

```js
import { createArena, startServer, runCommand } from 'pixel-founder-arena';

const arena = createArena({ persist: false });
arena.updateSettings({ language: 'hinglish', cooldown: 12 });
const service = await startServer(arena);
console.log(`Open ${service.url}`);

arena.on('event', event => console.log(event.type));
const run = runCommand(arena, process.execPath, ['app.js']);
const exitCode = await run.completion;

// Keep the arena open as needed, then clean up:
await service.close();
process.exitCode = exitCode;
```

For your own integrations, call `arena.reportError(output)`, `arena.success()`, or `arena.debate('Marketing')`. You can also import `founders`, `classifyError`, `errorGuides`, `chooseRoast`, `createDebate`, and `topics`. `createArena` persists by default; pass `persist: false` for tests or temporary sessions. The library never automatically opens a browser. `runCommand` returns `{ child, completion, stop }`; call `stop()` and await `completion` before closing your process if the child is still running.

## Development and tests

```sh
npm run check
npm test
npm pack --dry-run
npm pack
```

Tests cover real child-process diagnostics, split output chunks, literal argument passing, missing executables, exit codes, custom packs, settings validation, cooldown, saved state, task rewards, HTTP authentication, assets, and server-sent events.

## Publish your college project

1. Choose an available npm name. `pixel-founder-arena` is a working name; availability is not guaranteed. A scoped name such as `@YOUR_NPM_USERNAME/pixel-founder-arena` is another option. Update `name` in `package.json` if needed, and update API import examples to match.
2. Add your real author, repository, bugs, and homepage metadata to `package.json` once your repository exists.
3. Run the checks above and inspect `npm pack --dry-run`.
4. Sign in to your own npm account with `npm login`, completing browser authentication/2FA yourself.
5. From this source folder, run `npm publish --access public`.
6. Verify the published listing and install it from a fresh directory.

No registry credentials are needed to develop, test, or pack this project. Publishing requires your own authenticated npm account. A source ZIP and an npm tarball are different: the ZIP is for editing/submission; the tarball is for npm installation.

## Practical limits

This version is a standalone local browser arena launched by an npm CLI, not an IDE extension or an always-on desktop overlay. Output parsing is heuristic and may miss tool-specific diagnostics or classify user log messages containing error words. Hints are category-specific educational guidance, not code analysis or guaranteed fixes. Debates are authored templates, not live AI-generated conversations. Character motion uses static sprites, not directional sprite animation sheets. Automatic code editing, code execution from the browser, AI calls, and complete-language debugging support are not included.

Software: MIT. Brand marks and likenesses are not an endorsement; see [ASSETS.md](./ASSETS.md).
