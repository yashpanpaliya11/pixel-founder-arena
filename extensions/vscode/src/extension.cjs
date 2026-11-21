const vscode = require("vscode");
const { CompanionController } = require("./controller.cjs");

async function activate(context) {
  const core = await import("founder-fightclub/browser");
  const controller = new CompanionController(vscode, core, context);
  context.subscriptions.push(controller);
  controller.register();
  if (
    vscode.workspace.getConfiguration("founderFightclub").get("autoStart", true)
  ) {
    await vscode.commands.executeCommand(
      "workbench.view.extension.founderFightclub",
    );
  }
  return { controller };
}
module.exports = { activate, deactivate() {} };
