import * as assert from "assert";
import * as vscode from "vscode";

suite("Git Repositories Extension Test Suite", () => {
  vscode.window.showInformationMessage(
    "Starting Git Repositories extension tests",
  );

  test("Extension should be present and loadable", () => {
    const ext = vscode.extensions.getExtension("manlao.git-repositories");

    assert.ok(ext, "Extension should be present");
  });

  test("Sample test for basic assertion", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
