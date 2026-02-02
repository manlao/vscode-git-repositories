import * as vscode from "vscode";
import * as os from "os";

export const CONFIG_SECTION = "git-repositories";
export const CONFIG_PATHS = "paths";
export const CONFIG_IGNORE_PATHS = "ignorePaths";
export const CONFIG_SHOW_REPO_COUNT = "showRepositoryCount";

function expandEnvironmentVariables(path: string): string {
  let expanded = path.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] || "";
  });

  expanded = expanded.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_, varName) => {
    return process.env[varName] || "";
  });

  if (expanded.startsWith("~")) {
    expanded = os.homedir() + expanded.slice(1);
  }

  return expanded;
}

export function getRepositoryPaths(): string[] {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const paths = config.get<string[]>(CONFIG_PATHS, []);

  return paths
    .map((path) => expandEnvironmentVariables(path))
    .filter((path) => path.length > 0);
}

export function getIgnorePatterns(): string[] {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return config.get<string[]>(CONFIG_IGNORE_PATHS, [
    "**/node_modules/**",
    "**/.vscode/**",
    "**/dist/**",
    "**/build/**",
    "**/target/**",
  ]);
}

export function onConfigurationChange(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration(`${CONFIG_SECTION}.${CONFIG_PATHS}`) ||
      event.affectsConfiguration(`${CONFIG_SECTION}.${CONFIG_IGNORE_PATHS}`) ||
      event.affectsConfiguration(`${CONFIG_SECTION}.${CONFIG_SHOW_REPO_COUNT}`)
    ) {
      callback();
    }
  });
}

export function getShowRepositoryCount(): boolean {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return config.get<boolean>(CONFIG_SHOW_REPO_COUNT, true);
}
