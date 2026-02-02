import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Integration Test Suite", () => {
  test("Extension should be present", () => {
    const allExtensions = vscode.extensions.all.map((ext) => ext.id);
    const gitRepoExtension = allExtensions.find((id) =>
      id.includes("git-repositories"),
    );
    assert.ok(gitRepoExtension, "Extension should be present");
  });

  test("Extension should activate", async () => {
    const allExtensions = vscode.extensions.all;
    const ext = allExtensions.find((e) => e.id.includes("git-repositories"));

    if (ext) {
      await ext.activate();
      assert.strictEqual(ext.isActive, true);
    } else {
      assert.fail("Extension not found");
    }
  });

  test("Commands should be registered", async () => {
    const allExtensions = vscode.extensions.all;
    const ext = allExtensions.find((e) => e.id.includes("git-repositories"));

    if (ext && !ext.isActive) {
      await ext.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    const gitRepoCommands = commands.filter((cmd) =>
      cmd.startsWith("git-repositories"),
    );

    const expectedCommands = [
      "git-repositories.refreshRepositories",
      "git-repositories.openRepository",
      "git-repositories.openWorktree",
      "git-repositories.openRepositoryInNewWindow",
      "git-repositories.openWorktreeInNewWindow",
      "git-repositories.showQuickPick",
    ];

    for (const cmd of expectedCommands) {
      assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });

  test("Tree view should be registered", async () => {
    const allExtensions = vscode.extensions.all;
    const ext = allExtensions.find((e) => e.id.includes("git-repositories"));

    if (ext) {
      await ext.activate();
    }

    const treeView = vscode.window.createTreeView(
      "git-repositories.repositories",
      {
        treeDataProvider: {
          getTreeItem: (element: any) => element,
          getChildren: () => [],
        },
      },
    );

    assert.ok(treeView);
    treeView.dispose();
  });

  test("refreshRepositories command should execute without error", async () => {
    const allExtensions = vscode.extensions.all;
    const ext = allExtensions.find((e) => e.id.includes("git-repositories"));

    if (ext && !ext.isActive) {
      await ext.activate();
    }

    try {
      await vscode.commands.executeCommand(
        "git-repositories.refreshRepositories",
      );
      assert.ok(true);
    } catch (error) {
      assert.fail(`refreshRepositories command failed: ${error}`);
    }
  });

  test("showQuickPick command should execute without error", async () => {
    const allExtensions = vscode.extensions.all;
    const ext = allExtensions.find((e) => e.id.includes("git-repositories"));

    if (ext && !ext.isActive) {
      await ext.activate();
    }

    try {
      await vscode.commands.executeCommand("git-repositories.showQuickPick");
      assert.ok(true);
    } catch (error) {
      assert.fail(`showQuickPick command failed: ${error}`);
    }
  });
});
