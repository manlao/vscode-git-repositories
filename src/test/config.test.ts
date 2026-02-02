import * as assert from "assert";
import * as vscode from "vscode";
import {
  getRepositoryPaths,
  getIgnorePatterns,
  CONFIG_SECTION,
} from "../config";

suite("Config Test Suite", () => {
  test("getRepositoryPaths returns empty array when no paths configured", async () => {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    await config.update("paths", [], vscode.ConfigurationTarget.Global);

    const paths = getRepositoryPaths();
    assert.strictEqual(paths.length, 0);
  });

	test("getRepositoryPaths filters out empty strings", async () => {
		const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
		await config.update(
			"paths",
			["", "/valid/path"],
			vscode.ConfigurationTarget.Global,
		);

		const paths = getRepositoryPaths();
		assert.strictEqual(paths.length, 1);
		assert.strictEqual(paths[0], "/valid/path");
	});

  test("getIgnorePatterns returns default patterns when not configured", () => {
    const patterns = getIgnorePatterns();

    assert.ok(patterns.length > 0);
    assert.ok(patterns.includes("**/node_modules/**"));
    assert.ok(patterns.includes("**/.vscode/**"));
    assert.ok(patterns.includes("**/dist/**"));
  });

  test("getIgnorePatterns can be customized", async () => {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const customPatterns = ["**/custom/**", "**/ignore/**"];
    await config.update(
      "ignorePaths",
      customPatterns,
      vscode.ConfigurationTarget.Global,
    );

    const patterns = getIgnorePatterns();
    assert.deepStrictEqual(patterns, customPatterns);

    await config.update(
      "ignorePaths",
      undefined,
      vscode.ConfigurationTarget.Global,
    );
  });
});
